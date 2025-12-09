<?php
/**
 * EISLAW Privacy Report Shortcode
 * Version with requirements grid (replacing placeholder stubs)
 * For use with Code Snippets plugin
 */

if (!function_exists('eislaw_privacy_report_styles')) {
    function eislaw_privacy_report_styles() {
        return '<style>
        .eislaw-report { max-width: 800px; margin: 30px auto; padding: 25px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2937; direction: rtl; }
        .eislaw-report * { box-sizing: border-box; }
        .eislaw-header { text-align: center; margin-bottom: 30px; }
        .eislaw-title { font-size: 2em; font-weight: 700; color: #0d7377; margin: 0 0 10px 0; }
        .eislaw-business-name { font-size: 1.3em; color: #4b5563; margin: 0 0 20px 0; font-weight: 400; }
        .eislaw-level-badge { display: inline-block; padding: 15px 40px; color: white; border-radius: 10px; font-size: 1.3em; font-weight: 600; }
        .eislaw-level-badge.lone { background: #10b981; }
        .eislaw-level-badge.basic { background: #3b82f6; }
        .eislaw-level-badge.mid { background: #f59e0b; }
        .eislaw-level-badge.high { background: #ef4444; }
        .eislaw-meta { text-align: center; margin: 15px 0 30px 0; color: #6b7280; font-size: 0.9em; }
        .eislaw-section { background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .eislaw-section-title { font-size: 1.2em; font-weight: 600; color: #1f2937; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
        .eislaw-requirements-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .eislaw-requirement { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb; }
        .eislaw-requirement.active { background: #ecfdf5; border-color: #10b981; }
        .eislaw-requirement .icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .eislaw-requirement.active .icon { background: #10b981; color: white; }
        .eislaw-requirement.inactive .icon { background: #e5e7eb; color: #9ca3af; }
        .eislaw-requirement .label { font-size: 0.95em; }
        .eislaw-requirement.active .label { color: #065f46; font-weight: 500; }
        .eislaw-requirement.inactive .label { color: #9ca3af; }
        .eislaw-info-row { display: flex; align-items: center; gap: 10px; padding: 12px; background: white; border-radius: 6px; margin-top: 15px; }
        .eislaw-info-row strong { color: #374151; }
        .eislaw-divider { border: 0; height: 1px; background: #e5e7eb; margin: 15px 0; }
        .eislaw-footer { text-align: center; margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #0d7377 0%, #14919b 100%); border-radius: 10px; color: white; }
        .eislaw-footer a { color: white; text-decoration: underline; }
        .eislaw-error { max-width: 600px; margin: 40px auto; padding: 30px; font-family: system-ui, -apple-system, sans-serif; direction: rtl; }
        .eislaw-error-box { text-align: center; padding: 40px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca; }
        .eislaw-error-box h2 { color: #dc2626; margin: 0 0 10px 0; font-size: 1.5em; }
        .eislaw-error-box p { color: #991b1b; margin: 0; font-size: 1.1em; }
        </style>';
    }
}

if (!function_exists('eislaw_render_requirements_grid')) {
    function eislaw_render_requirements_grid($requirements) {
        // Main requirements
        $main_reqs = array(
            'dpo' => 'ממונה פרטיות (DPO)',
            'registration' => 'רישום מאגר מידע',
            'report' => 'דוח השפעה על הפרטיות (PIA)',
            'data_map' => 'מיפוי נתונים',
        );

        // Additional requirements
        $additional_reqs = array(
            'worker_security_agreement' => 'התחייבות/מדיניות אבטחת עובדים',
            'cameras_policy' => 'מדיניות מצלמות',
            'consultation_call' => 'שיחת ייעוץ/אימות',
            'outsourcing_text' => 'הנחיות מיקור חוץ (Processor)',
            'direct_marketing_rules' => 'כללי דיוור ישיר',
        );

        $output = '<div class="eislaw-section">';
        $output .= '<h3 class="eislaw-section-title">רכיבים נדרשים</h3>';
        $output .= '<div class="eislaw-requirements-grid">';

        // Render main requirements
        foreach ($main_reqs as $key => $label) {
            $is_active = isset($requirements[$key]) && $requirements[$key];
            $class = $is_active ? 'active' : 'inactive';
            $icon = $is_active ? '✓' : '−';
            $output .= '<div class="eislaw-requirement ' . $class . '">';
            $output .= '<span class="icon">' . $icon . '</span>';
            $output .= '<span class="label">' . esc_html($label) . '</span>';
            $output .= '</div>';
        }

        $output .= '</div>';
        $output .= '<hr class="eislaw-divider">';
        $output .= '<div class="eislaw-requirements-grid">';

        // Render additional requirements
        foreach ($additional_reqs as $key => $label) {
            $is_active = isset($requirements[$key]) && $requirements[$key];
            $class = $is_active ? 'active' : 'inactive';
            $icon = $is_active ? '✓' : '−';
            $output .= '<div class="eislaw-requirement ' . $class . '">';
            $output .= '<span class="icon">' . $icon . '</span>';
            $output .= '<span class="label">' . esc_html($label) . '</span>';
            $output .= '</div>';
        }

        $output .= '</div>';

        // Sensitive people count
        $sensitive_people = isset($requirements['sensitive_people']) ? intval($requirements['sensitive_people']) : 0;
        if ($sensitive_people > 0) {
            $output .= '<div class="eislaw-info-row">';
            $output .= '<strong>מספר אנשים שנתוניהם נמצאים במערכת:</strong> ';
            $output .= '<span>' . number_format($sensitive_people) . '</span>';
            $output .= '</div>';
        }

        // Storage locations
        $storage_locations = isset($requirements['storage_locations']) ? $requirements['storage_locations'] : array();
        if (!empty($storage_locations) && is_array($storage_locations)) {
            $output .= '<div class="eislaw-info-row">';
            $output .= '<strong>מיקומי אחסון:</strong> ';
            $output .= '<span>' . esc_html(implode(', ', $storage_locations)) . '</span>';
            $output .= '</div>';
        }

        $output .= '</div>';
        return $output;
    }
}

if (!function_exists('eislaw_privacy_report_shortcode')) {
    function eislaw_privacy_report_shortcode() {
        $styles = eislaw_privacy_report_styles();
        $token = isset($_GET['token']) ? sanitize_text_field(wp_unslash($_GET['token'])) : '';

        if (empty($token)) {
            return $styles . '<div class="eislaw-error"><div class="eislaw-error-box"><div style="font-size: 48px; margin-bottom: 15px;">⚠️</div><h2>חסר מזהה דוח</h2><p>יש להיכנס לקישור שנשלח אליך במייל</p></div></div>';
        }

        $api_url = 'http://20.217.86.4:8799/api/public/report/' . rawurlencode($token);
        $response = wp_remote_get($api_url, array(
            'timeout' => 15,
            'headers' => array('Origin' => 'https://eislaw.org'),
        ));

        if (is_wp_error($response)) {
            return $styles . '<div class="eislaw-error"><div class="eislaw-error-box"><div style="font-size: 48px; margin-bottom: 15px;">⚠️</div><h2>שגיאה בטעינת הדוח</h2><p>נסה שוב מאוחר יותר</p></div></div>';
        }

        $status = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ($status === 429) {
            return $styles . '<div class="eislaw-error"><div class="eislaw-error-box"><div style="font-size: 48px; margin-bottom: 15px;">⚠️</div><h2>יותר מדי בקשות</h2><p>המתן מספר שניות ונסה שוב</p></div></div>';
        }

        if ($status === 410 || (isset($data['reason']) && $data['reason'] === 'expired')) {
            return $styles . '<div class="eislaw-error"><div class="eislaw-error-box"><div style="font-size: 48px; margin-bottom: 15px;">⚠️</div><h2>תוקף הדוח פג</h2><p>דוח זה אינו זמין יותר. אנא מלא את השאלון מחדש.</p></div></div>';
        }

        if (!$data || !isset($data['valid']) || !$data['valid']) {
            return $styles . '<div class="eislaw-error"><div class="eislaw-error-box"><div style="font-size: 48px; margin-bottom: 15px;">⚠️</div><h2>דוח לא נמצא</h2><p>המזהה אינו תקין או שהדוח אינו קיים</p></div></div>';
        }

        // Build the report
        $level = isset($data['level']) ? $data['level'] : 'unknown';
        $level_hebrew = isset($data['level_hebrew']) ? $data['level_hebrew'] : '';
        $business_name = isset($data['business_name']) ? $data['business_name'] : '';
        $requirements = isset($data['requirements']) ? $data['requirements'] : array();
        $submitted_at = isset($data['submitted_at']) ? $data['submitted_at'] : '';
        $expires_at = isset($data['expires_at']) ? $data['expires_at'] : '';

        // Format dates
        $submitted_formatted = '';
        $expires_formatted = '';
        if ($submitted_at) {
            try {
                $dt = new DateTime($submitted_at);
                $submitted_formatted = $dt->format('d/m/Y H:i');
            } catch (Exception $e) {}
        }
        if ($expires_at) {
            try {
                $dt = new DateTime($expires_at);
                $expires_formatted = $dt->format('d/m/Y');
            } catch (Exception $e) {}
        }

        $output = $styles;
        $output .= '<div class="eislaw-report">';
        $output .= '<div class="eislaw-header">';
        $output .= '<h1 class="eislaw-title">דוח בחינת פרטיות</h1>';
        if (!empty($business_name)) {
            $output .= '<h2 class="eislaw-business-name">' . esc_html($business_name) . '</h2>';
        }
        $output .= '<div class="eislaw-level-badge ' . esc_attr($level) . '">רמת חשיפה: ' . esc_html($level_hebrew) . '</div>';
        $output .= '</div>';

        if ($submitted_formatted || $expires_formatted) {
            $output .= '<div class="eislaw-meta">';
            if ($submitted_formatted) {
                $output .= 'נוצר: ' . esc_html($submitted_formatted);
            }
            if ($expires_formatted) {
                $output .= ' | תוקף עד: ' . esc_html($expires_formatted);
            }
            $output .= '</div>';
        }

        // Render requirements grid
        $output .= eislaw_render_requirements_grid($requirements);

        // Footer
        $output .= '<div class="eislaw-footer">';
        $output .= '<p style="margin: 0 0 10px 0; font-size: 1.1em;">יש לך שאלות? צריך עזרה?</p>';
        $output .= '<p style="margin: 0;"><a href="https://eislaw.co.il">eislaw.co.il</a> | <a href="mailto:info@eislaw.co.il">info@eislaw.co.il</a></p>';
        $output .= '</div>';

        $output .= '</div>';
        return $output;
    }
}

add_shortcode('eislaw_privacy_report', 'eislaw_privacy_report_shortcode');
