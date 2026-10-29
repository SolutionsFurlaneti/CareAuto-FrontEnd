package br.com.furlaneti.autocare.printing;

import android.content.Context;
import android.os.RemoteException;

import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.InnerResultCallback;
import com.sunmi.peripheral.printer.SunmiPrinterService;

import org.json.JSONObject;

import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

final class SunmiPrinterAdapter {
    private static final long CONNECT_TIMEOUT_SECONDS = 15;
    private static final long PRINT_TIMEOUT_SECONDS = 45;

    private final Context context;
    private volatile SunmiPrinterService service;
    private volatile boolean bound;
    private InnerPrinterCallback callback;

    SunmiPrinterAdapter(Context context) {
        this.context = context.getApplicationContext();
    }

    static boolean supportsCurrentDevice() {
        String identity = (android.os.Build.MANUFACTURER + " " +
                android.os.Build.BRAND + " " + android.os.Build.MODEL)
                .toLowerCase(Locale.ROOT);
        return identity.contains("sunmi");
    }

    void printEntry(JSONObject ticket) throws Exception {
        print(
                "TICKET DE ESTACIONAMENTO\n",
                text(ticket, "estabelecimento"),
                text(ticket, "placa"),
                text(ticket, "veiculo"),
                text(ticket, "entrada"),
                text(ticket, "codigoQr"));
    }

    void printTest() throws Exception {
        print("AUTOCARE - TESTE DE IMPRESSAO\n", "", "", "", "", null);
    }

    private void print(
            String title, String establishment, String plate, String vehicle, String entry, String qr)
            throws Exception {
        SunmiPrinterService printer = connectedService();
        CountDownLatch completed = new CountDownLatch(1);
        AtomicReference<String> failure = new AtomicReference<>();

        try {
            printer.enterPrinterBuffer(true);
            printer.setAlignment(1, null);
            printer.printText(title, null);
            printer.setAlignment(0, null);
            if (!establishment.isEmpty()) printer.printText("Estabelecimento: " + safe(establishment) + "\n", null);
            if (!plate.isEmpty()) printer.printText("Placa: " + safe(plate) + "\n", null);
            if (!vehicle.isEmpty()) printer.printText("Veiculo: " + safe(vehicle) + "\n", null);
            if (!entry.isEmpty()) printer.printText("Entrada: " + safe(entry) + "\n", null);
            if (qr != null && !qr.isEmpty()) {
                printer.lineWrap(1, null);
                printer.setAlignment(1, null);
                printer.printQRCode(qr, 6, 2, null);
                printer.setAlignment(0, null);
            }
            printer.lineWrap(3, null);
            printer.exitPrinterBufferWithCallback(true, new InnerResultCallback() {
                @Override
                public void onRunResult(boolean success) throws RemoteException {
                    if (!success) {
                        failure.compareAndSet(null, "A impressora SUNMI recusou o trabalho.");
                        completed.countDown();
                    }
                }

                @Override
                public void onReturnString(String result) throws RemoteException { }

                @Override
                public void onRaiseException(int code, String message) throws RemoteException {
                    failure.compareAndSet(null, "Erro SUNMI " + code + ": " + message);
                    completed.countDown();
                }

                @Override
                public void onPrintResult(int code, String message) throws RemoteException {
                    if (code != 0) failure.compareAndSet(null, "Erro SUNMI " + code + ": " + message);
                    completed.countDown();
                }
            });
            if (!completed.await(PRINT_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                throw new IllegalStateException("A impressora SUNMI não confirmou o ticket no prazo.");
            }
            if (failure.get() != null) throw new IllegalStateException(failure.get());
        } catch (Exception exception) {
            try { printer.exitPrinterBuffer(false); } catch (Exception ignored) { }
            throw exception;
        }
    }

    private SunmiPrinterService connectedService() throws Exception {
        SunmiPrinterService current = service;
        if (current != null) return current;

        CountDownLatch connected = new CountDownLatch(1);
        callback = new InnerPrinterCallback() {
            @Override
            public void onConnected(SunmiPrinterService printerService) {
                service = printerService;
                connected.countDown();
            }

            @Override
            public void onDisconnected() {
                service = null;
            }
        };
        bound = InnerPrinterManager.getInstance().bindService(context, callback);
        if (!bound) throw new IllegalStateException("Não foi possível conectar ao serviço de impressão SUNMI.");
        if (!connected.await(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS) || service == null) {
            throw new IllegalStateException("O serviço de impressão SUNMI não respondeu.");
        }
        return service;
    }

    void close() {
        if (!bound || callback == null) return;
        try {
            InnerPrinterManager.getInstance().unBindService(context, callback);
        } catch (Exception ignored) { }
        bound = false;
        callback = null;
        service = null;
    }

    private static String text(JSONObject object, String name) {
        if (object == null || object.isNull(name)) return "";
        return object.optString(name, "");
    }

    private static String safe(String value) {
        return value.replace("\r", " ").replace("\n", " ").replace("\u0000", "");
    }
}