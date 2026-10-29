package br.com.furlaneti.autocare.printing;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.ContextCompat;

@CapacitorPlugin(name = "AndroidPrintAgent")
public final class NativePrintAgentPlugin extends Plugin {
    @PluginMethod
    public void getDeviceId(PluginCall call) {
        JSObject result = new JSObject();
        result.put("deviceId", AgentConfigStore.getDeviceId(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", AndroidPrintAgentService.isRunning());
        result.put("deviceId", AgentConfigStore.getDeviceId(getContext()));
        result.put("supported", SunmiPrinterAdapter.supportsCurrentDevice());
        result.put("model", android.os.Build.MODEL);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String apiUrl = call.getString("apiUrl", "").trim();
        String token = call.getString("token", "").trim();
        Uri uri = Uri.parse(apiUrl);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            call.reject("Informe o endereço HTTPS da API.");
            return;
        }
        if (!token.startsWith("acm_") || token.length() > 80) {
            call.reject("Informe o token do agente gerado em Configurações > Impressão.");
            return;
        }
        if (!SunmiPrinterAdapter.supportsCurrentDevice()) {
            call.reject("O agente atual oferece suporte à impressora integrada SUNMI. Este dispositivo não foi reconhecido como SUNMI.");
            return;
        }
        try {
            AgentConfigStore.save(getContext(), apiUrl, token);
            ContextCompat.startForegroundService(
                    getContext(),
                    new Intent(getContext(), AndroidPrintAgentService.class));
            JSObject result = new JSObject();
            result.put("deviceId", AgentConfigStore.getDeviceId(getContext()));
            result.put("running", true);
            result.put("supported", SunmiPrinterAdapter.supportsCurrentDevice());
            result.put("model", android.os.Build.MODEL);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Não foi possível iniciar o agente local de impressão.", exception);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), AndroidPrintAgentService.class));
        call.resolve();
    }
}