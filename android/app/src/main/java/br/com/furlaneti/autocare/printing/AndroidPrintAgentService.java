package br.com.furlaneti.autocare.printing;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import br.com.furlaneti.autocare.MainActivity;
import br.com.furlaneti.autocare.R;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public final class AndroidPrintAgentService extends Service {
    private static final String TAG = "AutoCarePrintAgent";
    private static final String CHANNEL_ID = "autocare_print_agent";
    private static final int NOTIFICATION_ID = 8024;
    private static final long POLL_MS = 3000;
    private static volatile boolean running;

    private volatile boolean stopping;
    private Thread worker;
    private SunmiPrinterAdapter printer;
    private AgentConfigStore.AgentConfig config;

    static boolean isRunning() { return running; }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        printer = new SunmiPrinterAdapter(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            config = AgentConfigStore.load(this);
        } catch (Exception exception) {
            Log.e(TAG, "Não foi possível ler a configuração protegida do agente.", exception);
        }
        if (config == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            ServiceCompat.startForeground(
                    this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        stopping = false;
        running = true;
        if (worker == null || !worker.isAlive()) {
            worker = new Thread(this::pollLoop, "CareAuto-Sunmi-Print-Agent");
            worker.start();
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopping = true;
        running = false;
        if (printer != null) printer.close();
        super.onDestroy();
    }

    private void pollLoop() {
        long delay = POLL_MS;
        while (!stopping) {
            try {
                JSONArray jobs = reserveJobs();
                for (int i = 0; i < jobs.length() && !stopping; i++) processJob(jobs.getJSONObject(i));
                delay = POLL_MS;
            } catch (UnauthorizedAgentException exception) {
                Log.e(TAG, "Token recusado pelo servidor. Atualize o token do agente.");
                delay = 60000;
            } catch (Exception exception) {
                Log.w(TAG, "Falha temporária ao consultar a fila: " + exception.getMessage());
                delay = Math.min(Math.max(POLL_MS, delay * 2), 60000);
            }
            try {
                Thread.sleep(delay);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        running = false;
        stopSelf();
    }

    private JSONArray reserveJobs() throws Exception {
        String id = URLEncoder.encode(config.deviceId, "UTF-8");
        HttpURLConnection connection = open(
                config.apiUrl + "/api/v1/agente-impressao/trabalhos?dispositivoId=" + id, "GET");
        try {
            int status = connection.getResponseCode();
            if (status == 401) throw new UnauthorizedAgentException();
            if (status < 200 || status >= 300) throw new IOException("HTTP " + status);
            return new JSONArray(new String(readAll(connection.getInputStream()), StandardCharsets.UTF_8));
        } finally {
            connection.disconnect();
        }
    }

    private void processJob(JSONObject job) {
        long id = job.optLong("impressaoId", -1);
        boolean success = false;
        String error = null;
        try {
            JSONObject printerInfo = job.getJSONObject("impressora");
            if (!"ANDROID_POS".equals(printerInfo.optString("tipoConexao")) ||
                    !config.deviceId.equals(printerInfo.optString("endereco"))) {
                throw new IllegalStateException("O trabalho foi encaminhado a outro POS Android.");
            }
            String type = job.optString("tipo");
            if ("TESTE".equals(type)) {
                printer.printTest();
            } else if ("ENTRADA".equals(type)) {
                JSONObject ticket = job.optJSONObject("ticket");
                if (ticket == null) throw new IllegalStateException("O ticket de entrada está incompleto.");
                printer.printEntry(ticket);
            } else {
                throw new IllegalStateException("Tipo de impressão Android desconhecido.");
            }
            success = true;
        } catch (Exception exception) {
            error = exception.getMessage();
            Log.e(TAG, "Falha no trabalho " + id + ": " + error);
        }

        try {
            reportResult(id, success, error);
        } catch (Exception exception) {
            Log.w(TAG, "A API não confirmou o resultado do trabalho " + id + ": " + exception.getMessage());
        }
    }

    private void reportResult(long id, boolean success, String error) throws Exception {
        String device = URLEncoder.encode(config.deviceId, "UTF-8");
        HttpURLConnection connection = open(
                config.apiUrl + "/api/v1/agente-impressao/trabalhos/" + id + "/resultado?dispositivoId=" + device, "POST");
        try {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            JSONObject body = new JSONObject();
            body.put("sucesso", success);
            body.put("erro", error == null ? JSONObject.NULL : error);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int status = connection.getResponseCode();
            if (status == 401) throw new UnauthorizedAgentException();
            if (status < 200 || status >= 300) throw new IOException("HTTP " + status);
        } finally {
            connection.disconnect();
        }
    }

    private HttpURLConnection open(String address, String method) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("X-AutoCare-Agente", config.token);
        return connection;
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pending = launch == null ? null : PendingIntent.getActivity(
                this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("CareAuto: agente de impressão ativo")
                .setContentText("A fila de tickets deste POS está sendo acompanhada.")
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW);
        if (pending != null) builder.setContentIntent(pending);
        return builder.build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Agente local de impressão", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Acompanha a fila de tickets neste terminal POS.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private static byte[] readAll(InputStream input) throws IOException {
        try (InputStream source = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = source.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }

    private static final class UnauthorizedAgentException extends IOException {
        UnauthorizedAgentException() { super("Token do agente recusado."); }
    }
}