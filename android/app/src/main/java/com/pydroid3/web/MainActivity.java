
package com.pydroid3.web;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Giao diện thống nhất trên mọi phiên bản Android: tự chừa chỗ cho thanh trạng thái
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(Color.parseColor("#181822"));

        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });

        // Biểu tượng pin/sóng màu sáng để nhìn rõ trên nền tối
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), content);
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}
