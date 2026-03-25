<?php
/**
 * Admin Settings Page for Beauty Care by Nabila
 */

if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_menu_page(
        'Beauty Care Nabila',
        'Beauty Care Nabila',
        'manage_options',
        'beauty-care-nabila',
        'bcn_settings_page',
        'dashicons-admin-users'
    );

    add_submenu_page(
        'beauty-care-nabila',
        'Settings',
        'Settings',
        'manage_options',
        'beauty-care-nabila',
        'bcn_settings_page'
    );

    add_submenu_page(
        'beauty-care-nabila',
        'Salon Packages',
        'Packages',
        'manage_options',
        'beauty-care-nabila-packages',
        'bcn_packages_page'
    );

    add_submenu_page(
        'beauty-care-nabila',
        'Appointments',
        'Appointments',
        'manage_options',
        'beauty-care-nabila-appointments',
        'bcn_appointments_page'
    );

    add_submenu_page(
        'beauty-care-nabila',
        'Salon Bot Widget',
        'Salon Bot',
        'manage_options',
        'salonbot-settings',
        'salonbot_settings_page'
    );
});

// ─── REST API Route for Calendar Test ─────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('bcn/v1', '/test-calendar', array(
        'methods' => 'GET',
        'callback' => 'bcn_test_calendar_callback',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    register_rest_route('bcn/v1', '/appointments', array(
        'methods' => 'GET',
        'callback' => 'bcn_get_appointments_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('bcn/v1', '/appointments/book', array(
        'methods' => 'POST',
        'callback' => 'bcn_book_appointment_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('bcn/v1', '/appointments/check', array(
        'methods' => 'GET',
        'callback' => 'bcn_check_availability_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('bcn/v1', '/appointments/find', array(
        'methods' => 'GET',
        'callback' => 'bcn_find_appointments_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('bcn/v1', '/appointments/(?P<id>[a-zA-Z0-9_]+)', array(
        'methods' => array('DELETE', 'PATCH'),
        'callback' => 'bcn_appointment_action_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('bcn/v1', '/packages', array(
        'methods' => 'GET',
        'callback' => 'bcn_get_packages_callback',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('bcn/v1', '/settings', array(
        'methods' => 'GET',
        'callback' => 'bcn_get_settings_callback',
        'permission_callback' => '__return_true'
    ));
});

function bcn_get_settings_callback() {
    return new WP_REST_Response(array(
        'salonName' => get_option('bcn_salon_name', 'Beauty Care by Nabila'),
        'salonAddress' => get_option('bcn_salon_address', ''),
        'salonPhone' => get_option('bcn_salon_phone', ''),
        'salonEmail' => get_option('bcn_salon_email', ''),
        'salonHours' => get_option('bcn_salon_hours', ''),
        'aiInstructions' => get_option('bcn_ai_instructions', '')
    ), 200);
}

function bcn_get_appointments_callback() {
    try {
        $calendar = new BCN_Google_Calendar();
        $appointments = $calendar->get_appointments();
        return new WP_REST_Response($appointments, 200);
    } catch (Exception $e) {
        return new WP_REST_Response(array('error' => $e->getMessage()), 500);
    }
}

function bcn_find_appointments_callback($request) {
    try {
        $name = $request->get_param('name');
        $calendar = new BCN_Google_Calendar();
        $appointments = $calendar->find_appointments($name);
        return new WP_REST_Response($appointments, 200);
    } catch (Exception $e) {
        return new WP_REST_Response(array('error' => $e->getMessage()), 500);
    }
}

function bcn_appointment_action_callback($request) {
    try {
        $id = $request['id'];
        $method = $request->get_method();
        $calendar = new BCN_Google_Calendar();

        if ($method === 'DELETE') {
            $calendar->delete_appointment($id);
            return new WP_REST_Response(array('status' => 'success'), 200);
        } elseif ($method === 'PATCH') {
            $params = $request->get_json_params();
            $calendar->update_appointment($id, $params['startTime']);
            return new WP_REST_Response(array('status' => 'success'), 200);
        }
        
        return new WP_REST_Response(array('error' => 'Method not allowed'), 405);
    } catch (Exception $e) {
        return new WP_REST_Response(array('error' => $e->getMessage()), 500);
    }
}

function bcn_book_appointment_callback($request) {
    try {
        $params = $request->get_json_params();
        $calendar = new BCN_Google_Calendar();
        $result = $calendar->book_appointment(
            $params['name'],
            $params['email'],
            $params['package_name'],
            $params['startTime']
        );
        return new WP_REST_Response(array('status' => 'success', 'eventId' => $result['id'], 'link' => $result['link']), 200);
    } catch (Exception $e) {
        return new WP_REST_Response(array('error' => $e->getMessage()), 500);
    }
}

function bcn_check_availability_callback($request) {
    try {
        $start_time = $request->get_param('startTime');
        $calendar = new BCN_Google_Calendar();
        $is_available = $calendar->check_availability($start_time);
        
        if ($is_available) {
            return new WP_REST_Response(array('available' => true), 200);
        } else {
            $alternatives = $calendar->find_alternative_slots($start_time);
            return new WP_REST_Response(array('available' => false, 'alternatives' => $alternatives), 200);
        }
    } catch (Exception $e) {
        return new WP_REST_Response(array('error' => $e->getMessage()), 500);
    }
}

function bcn_get_packages_callback() {
    $packages = get_option('bcn_packages', array());
    return new WP_REST_Response($packages, 200);
}

function bcn_test_calendar_callback() {
    try {
        if (!class_exists('BCN_Google_Calendar')) {
            return new WP_REST_Response(array('success' => false, 'message' => 'BCN_Google_Calendar class not found.'), 500);
        }
        
        $calendar = new BCN_Google_Calendar();
        // Try to check availability for a dummy time to test the connection
        $calendar->check_availability(date('Y-m-d\TH:i:s\Z', time() + 86400));
        
        return new WP_REST_Response(array('success' => true, 'data' => array('message' => 'Successfully connected to Google Calendar!')), 200);
    } catch (Exception $e) {
        return new WP_REST_Response(array('success' => false, 'message' => $e->getMessage()), 200);
    }
}

function bcn_appointments_page() {
    if (!current_user_can('manage_options')) return;
    
    if (!class_exists('BCN_Google_Calendar')) {
        echo '<div class="error"><p>BCN_Google_Calendar class not found.</p></div>';
        return;
    }

    $calendar = new BCN_Google_Calendar();
    try {
        $appointments = $calendar->get_appointments();
    } catch (Exception $e) {
        echo '<div class="error"><p>Error fetching appointments: ' . esc_html($e->getMessage()) . '</p></div>';
        $appointments = array();
    }
    ?>
    <div class="wrap">
        <h1>Client Appointments</h1>
        <p>View and manage bookings from your Google Calendar.</p>
        
        <table class="widefat fixed striped">
            <thead>
                <tr>
                    <th>Client Name</th>
                    <th>Email</th>
                    <th>Package</th>
                    <th>Date & Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($appointments)): ?>
                    <?php foreach ($appointments as $app): ?>
                        <tr>
                            <td><strong><?php echo esc_html($app['name']); ?></strong></td>
                            <td><?php echo esc_html($app['email']); ?></td>
                            <td><?php echo esc_html($app['package_name']); ?></td>
                            <td><?php echo esc_html(date('l, F j, Y - g:i A', strtotime($app['startTime']))); ?></td>
                            <td>
                                <a href="#" class="button button-link-delete bcn-cancel-app" data-id="<?php echo esc_attr($app['id']); ?>">Cancel</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5">No appointments found.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    <script>
    document.querySelectorAll('.bcn-cancel-app').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!confirm('Are you sure you want to cancel this appointment?')) return;
            
            const id = this.dataset.id;
            const row = this.closest('tr');
            
            fetch('<?php echo esc_url_raw(rest_url('bcn/v1/appointments/')); ?>' + id, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>' }
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    row.remove();
                } else {
                    alert('Error: ' + (data.error || 'Unknown error'));
                }
            });
        });
    });
    </script>
    <?php
}

function bcn_packages_page() {
    if (!current_user_can('manage_options')) return;

    // Handle saving packages
    if (isset($_POST['bcn_save_packages'])) {
        check_admin_referer('bcn_packages_action', 'bcn_packages_nonce');
        
        $packages = array();
        if (isset($_POST['package_name']) && is_array($_POST['package_name'])) {
            for ($i = 0; $i < count($_POST['package_name']); $i++) {
                if (!empty($_POST['package_name'][$i])) {
                    $packages[] = array(
                        'name' => sanitize_text_field($_POST['package_name'][$i]),
                        'price' => sanitize_text_field($_POST['package_price'][$i]),
                        'description' => sanitize_textarea_field($_POST['package_description'][$i])
                    );
                }
            }
        }
        update_option('bcn_packages', $packages);
        echo '<div class="updated"><p>Packages saved successfully!</p></div>';
    }

    $packages = get_option('bcn_packages', array());
    
    // If empty, provide some defaults if it's the first time
    if (empty($packages)) {
        $packages = array(
            array('name' => 'Hydrafacial – Deal 1', 'price' => '3,199', 'description' => 'Deep-cleaning Hydrafacial with LED mask and full hand & foot care.'),
            array('name' => 'Full Body Waxing – Deal 2', 'price' => '2,499', 'description' => 'Complete body waxing with bikini & underarms and polishing add-ons.')
        );
    }
    ?>
    <div class="wrap">
        <h1>Manage Salon Packages</h1>
        <p>Add, edit, or remove the packages offered by your salon. These will be used by the AI Receptionist.</p>
        
        <form method="post" action="">
            <?php wp_nonce_field('bcn_packages_action', 'bcn_packages_nonce'); ?>
            <table class="widefat fixed" id="bcn-packages-table">
                <thead>
                    <tr>
                        <th style="width: 30%;">Package Name</th>
                        <th style="width: 15%;">Price (Rs.)</th>
                        <th>Description</th>
                        <th style="width: 10%;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($packages)): ?>
                        <?php foreach ($packages as $index => $package): ?>
                            <tr>
                                <td><input type="text" name="package_name[]" value="<?php echo esc_attr($package['name']); ?>" class="widefat" required></td>
                                <td><input type="text" name="package_price[]" value="<?php echo esc_attr($package['price']); ?>" class="widefat"></td>
                                <td><textarea name="package_description[]" class="widefat" rows="2"><?php echo esc_textarea($package['description']); ?></textarea></td>
                                <td><button type="button" class="button bcn-remove-row">Remove</button></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <tr id="bcn-new-row-template" style="display: none;">
                        <td><input type="text" name="package_name[]" value="" class="widefat"></td>
                        <td><input type="text" name="package_price[]" value="" class="widefat"></td>
                        <td><textarea name="package_description[]" class="widefat" rows="2"></textarea></td>
                        <td><button type="button" class="button bcn-remove-row">Remove</button></td>
                    </tr>
                </tbody>
            </table>
            
            <p>
                <button type="button" id="bcn-add-package" class="button">Add New Package</button>
            </p>
            
            <p class="submit">
                <input type="submit" name="bcn_save_packages" id="submit" class="button button-primary" value="Save Packages">
            </p>
        </form>

        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const tableBody = document.querySelector('#bcn-packages-table tbody');
            const addBtn = document.getElementById('bcn-add-package');
            const template = document.getElementById('bcn-new-row-template');

            addBtn.addEventListener('click', function() {
                const newRow = template.cloneNode(true);
                newRow.id = '';
                newRow.style.display = '';
                newRow.querySelector('input').required = true;
                tableBody.appendChild(newRow);
                
                // Attach remove event to new row
                newRow.querySelector('.bcn-remove-row').addEventListener('click', function() {
                    newRow.remove();
                });
            });

            // Attach remove event to existing rows
            document.querySelectorAll('.bcn-remove-row').forEach(btn => {
                btn.addEventListener('click', function() {
                    btn.closest('tr').remove();
                });
            });
        });
        </script>
    </div>
    <?php
}

function bcn_settings_page() {
    if (!current_user_can('manage_options')) return;

    if (isset($_POST['bcn_save_settings'])) {
        check_admin_referer('bcn_settings_action', 'bcn_settings_nonce');
        
        update_option('bcn_salon_name', sanitize_text_field($_POST['salon_name']));
        update_option('bcn_salon_address', sanitize_textarea_field($_POST['salon_address']));
        update_option('bcn_salon_phone', sanitize_text_field($_POST['salon_phone']));
        update_option('bcn_salon_email', sanitize_email($_POST['salon_email']));
        update_option('bcn_salon_hours', sanitize_textarea_field($_POST['salon_hours']));
        update_option('bcn_ai_instructions', sanitize_textarea_field($_POST['ai_instructions']));

        update_option('bcn_service_account_email', sanitize_email($_POST['service_email']));
        update_option('bcn_private_key', wp_unslash($_POST['private_key'])); 
        update_option('bcn_calendar_id', sanitize_text_field($_POST['calendar_id']));
        update_option('bcn_gemini_api_key', sanitize_text_field($_POST['gemini_api_key']));

        echo '<div class="updated"><p>Settings saved successfully!</p></div>';
    }

    $salon_name = get_option('bcn_salon_name', 'Beauty Care by Nabila');
    $salon_address = get_option('bcn_salon_address', 'Moulana Shoukat Ali Road, Adjacent to Dubai Islamic Bank, Near Model Town Link Road, Lahore, Pakistan');
    $salon_phone = get_option('bcn_salon_phone', '0335-1724356, 042-35222238');
    $salon_email = get_option('bcn_salon_email', 'beauty.carebynabila@gmail.com');
    $salon_hours = get_option('bcn_salon_hours', 'Monday–Sunday: 11:00 AM – 8:00 PM');
    $ai_instructions = get_option('bcn_ai_instructions', "Beauty Care by Nabila is a professional beauty salon located in Lahore, Pakistan, offering high‑quality beauty, hair, skincare, nail, lash, waxing, and bridal services. The salon focuses on affordability, hygiene, expert staff, and premium products.\n\nFounder: Nabila (20+ years of experience)\nStaff: 15 professional beauty experts\nSignature Product: Sigma Hair Oil (100% organic).");

    $service_email = get_option('bcn_service_account_email');
    $private_key = get_option('bcn_private_key');
    $calendar_id = get_option('bcn_calendar_id');
    $gemini_api_key = get_option('bcn_gemini_api_key');
    ?>
    <div class="wrap">
        <h1>Beauty Care by Nabila - AI Receptionist Settings</h1>
        <form method="post" action="">
            <?php wp_nonce_field('bcn_settings_action', 'bcn_settings_nonce'); ?>
            
            <h2>AI & API Configuration</h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="gemini_api_key">Gemini API Key</label></th>
                    <td>
                        <input name="gemini_api_key" type="password" id="gemini_api_key" value="<?php echo esc_attr($gemini_api_key); ?>" class="regular-text">
                        <p class="description">Your Google Gemini API Key for the AI Receptionist.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="ai_instructions">AI Knowledge Base / Instructions</label></th>
                    <td>
                        <textarea name="ai_instructions" id="ai_instructions" rows="8" cols="50" class="large-text"><?php echo esc_textarea($ai_instructions); ?></textarea>
                        <p class="description">General information about your salon and specific instructions for the AI. This is what the AI "knows" about your business.</p>
                    </td>
                </tr>
            </table>

            <h2>Salon Information</h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="salon_name">Salon Name</label></th>
                    <td>
                        <input name="salon_name" type="text" id="salon_name" value="<?php echo esc_attr($salon_name); ?>" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="salon_address">Address</label></th>
                    <td>
                        <textarea name="salon_address" id="salon_address" rows="3" cols="50" class="regular-text"><?php echo esc_textarea($salon_address); ?></textarea>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="salon_phone">Phone Number(s)</label></th>
                    <td>
                        <input name="salon_phone" type="text" id="salon_phone" value="<?php echo esc_attr($salon_phone); ?>" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="salon_email">Public Email</label></th>
                    <td>
                        <input name="salon_email" type="email" id="salon_email" value="<?php echo esc_attr($salon_email); ?>" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="salon_hours">Working Hours</label></th>
                    <td>
                        <textarea name="salon_hours" id="salon_hours" rows="3" cols="50" class="regular-text"><?php echo esc_textarea($salon_hours); ?></textarea>
                    </td>
                </tr>
            </table>

            <h2>Google Calendar Integration</h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="service_email">Service Account Email</label></th>
                    <td>
                        <input name="service_email" type="email" id="service_email" value="<?php echo esc_attr($service_email); ?>" class="regular-text">
                        <p class="description">The email address of your Google Service Account.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="private_key">Private Key</label></th>
                    <td>
                        <textarea name="private_key" id="private_key" rows="10" cols="50" class="large-text code"><?php echo esc_textarea($private_key); ?></textarea>
                        <p class="description">The full private key from your Service Account JSON (including headers).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="calendar_id">Google Calendar ID</label></th>
                    <td>
                        <input name="calendar_id" type="text" id="calendar_id" value="<?php echo esc_attr($calendar_id); ?>" class="regular-text">
                        <p class="description">The ID of the calendar to use (e.g., your email or a group calendar ID).</p>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="bcn_save_settings" id="submit" class="button button-primary" value="Save Settings">
                <button type="button" id="bcn-test-connection" class="button">Test Google Calendar Connection</button>
                <span id="bcn-test-result" style="margin-left: 10px; font-weight: bold;"></span>
            </p>
        </form>

        <script>
        document.getElementById('bcn-test-connection').addEventListener('click', function() {
            const resultSpan = document.getElementById('bcn-test-result');
            resultSpan.textContent = 'Testing...';
            resultSpan.style.color = 'inherit';

            fetch('<?php echo esc_url_raw(rest_url('bcn/v1/test-calendar')); ?>', {
                headers: { 'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>' }
            })
            .then(response => {
                return response.text().then(text => {
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        throw new Error("Server returned non-JSON response. This usually means a PHP error occurred. Response: " + text.substring(0, 200));
                    }
                });
            })
            .then(data => {
                if (data.success) {
                    resultSpan.textContent = '✅ ' + (data.data.message || 'Connected!');
                    resultSpan.style.color = 'green';
                } else {
                    const errorMsg = (data.data && data.data.message) ? data.data.message : (data.message || 'Unknown error');
                    resultSpan.textContent = '❌ Error: ' + errorMsg;
                    resultSpan.style.color = 'red';
                }
            })
            .catch(error => {
                resultSpan.textContent = '❌ Request failed: ' + error.message;
                resultSpan.style.color = 'red';
            });
        });
        </script>

        <hr>
        <h2>Usage</h2>
        <p>The AI Receptionist chat widget is now <strong>automatically enabled</strong> on all pages of your website for your visitors.</p>
        <p>It will <strong>not</strong> appear in the WordPress Admin dashboard.</p>

        <hr>
        <h2>Google Calendar Setup Guide</h2>
        <ol>
            <li>Go to the <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>.</li>
            <li>Create a project and enable the <strong>Google Calendar API</strong>.</li>
            <li>Go to <strong>IAM & Admin > Service Accounts</strong> and create a Service Account.</li>
            <li>Create a <strong>JSON Key</strong> for the service account and download it.</li>
            <li>Copy the <code>client_email</code> and <code>private_key</code> from the JSON file into the fields above.</li>
            <li><strong>CRITICAL:</strong> Open your Google Calendar, go to <strong>Settings and sharing</strong>, and under <strong>Share with specific people</strong>, add the Service Account Email with "Make changes to events" permission.</li>
            <li>Copy the <strong>Calendar ID</strong> from the calendar settings (usually your email or a long string ending in <code>@group.calendar.google.com</code>).</li>
        </ol>

        <hr>
        <h2>Troubleshooting (Local by Flywheel)</h2>
        <p>If you are using <strong>Local by Flywheel</strong> and the "Call" button or chat is not working, please check the following:</p>
        <ul>
            <li><strong>HTTPS is Required:</strong> Voice calls (microphone access) require a secure connection. In Local, go to the <strong>SSL</strong> tab and click <strong>Trust</strong>, then ensure you are accessing your site via <code>https://</code>.</li>
            <li><strong>Live Links:</strong> If you are using Live Links, ensure your site's "Site Address" in WordPress settings matches the Live Link URL, or the browser may block API calls due to CORS.</li>
            <li><strong>API Key:</strong> Ensure you have entered a valid Gemini API key above.</li>
        </ul>
    </div>
    <?php
}
