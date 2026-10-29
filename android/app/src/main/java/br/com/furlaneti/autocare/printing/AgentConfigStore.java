package br.com.furlaneti.autocare.printing;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class AgentConfigStore {
    private static final String PREFS = "autocare_print_agent";
    private static final String DEVICE_ID = "device_id";
    private static final String API_URL = "api_url";
    private static final String TOKEN = "token";
    private static final String KEY_ALIAS = "careauto.print.agent.token";
    private static final String KEYSTORE = "AndroidKeyStore";

    static synchronized String getDeviceId(Context context) {
        SharedPreferences preferences = prefs(context);
        String id = preferences.getString(DEVICE_ID, null);
        if (id == null || id.isEmpty()) {
            id = UUID.randomUUID().toString();
            preferences.edit().putString(DEVICE_ID, id).apply();
        }
        return id;
    }

    static synchronized void save(Context context, String apiUrl, String token) throws Exception {
        String encrypted = encrypt(token);
        prefs(context).edit()
                .putString(API_URL, apiUrl.replaceAll("/+$", ""))
                .putString(TOKEN, encrypted)
                .apply();
    }

    static synchronized AgentConfig load(Context context) throws Exception {
        SharedPreferences preferences = prefs(context);
        String apiUrl = preferences.getString(API_URL, null);
        String encrypted = preferences.getString(TOKEN, null);
        if (apiUrl == null || encrypted == null) return null;
        String token = decrypt(encrypted);
        if (token == null || token.isEmpty()) return null;
        return new AgentConfig(apiUrl, token, getDeviceId(context));
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        ByteBuffer output = ByteBuffer.allocate(1 + iv.length + ciphertext.length);
        output.put((byte) iv.length);
        output.put(iv);
        output.put(ciphertext);
        return Base64.encodeToString(output.array(), Base64.NO_WRAP);
    }

    private static String decrypt(String encoded) throws Exception {
        byte[] data = Base64.decode(encoded, Base64.NO_WRAP);
        ByteBuffer input = ByteBuffer.wrap(data);
        int ivLength = input.get() & 0xff;
        if (ivLength < 12 || ivLength > 16 || input.remaining() <= ivLength) return null;
        byte[] iv = new byte[ivLength];
        input.get(iv);
        byte[] ciphertext = new byte[input.remaining()];
        input.get(ciphertext);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }

    static final class AgentConfig {
        final String apiUrl;
        final String token;
        final String deviceId;

        AgentConfig(String apiUrl, String token, String deviceId) {
            this.apiUrl = apiUrl;
            this.token = token;
            this.deviceId = deviceId;
        }
    }
}