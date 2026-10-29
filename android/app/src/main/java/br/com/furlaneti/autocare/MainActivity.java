package br.com.furlaneti.autocare;

import android.os.Bundle;
import br.com.furlaneti.autocare.printing.NativePrintAgentPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePrintAgentPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
