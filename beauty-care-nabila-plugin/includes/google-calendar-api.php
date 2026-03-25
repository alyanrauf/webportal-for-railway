<?php
/**
 * Lightweight Google Calendar API Client for WordPress
 */

if (!defined('ABSPATH')) exit;

class BCN_Google_Calendar {
    private $email;
    private $private_key;
    private $calendar_id;
    private $access_token;

    public function __construct() {
        $this->email = get_option('bcn_service_account_email');
        $this->private_key = get_option('bcn_private_key');
        $this->calendar_id = get_option('bcn_calendar_id', 'primary');
    }

    /**
     * Get OAuth2 Access Token using JWT
     */
    private function get_access_token() {
        if ($this->access_token) return $this->access_token;

        if (!$this->email || !$this->private_key) {
            throw new Exception("Missing Google Service Account credentials.");
        }

        $now = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim = base64_encode(json_encode([
            'iss' => $this->email,
            'scope' => 'https://www.googleapis.com/auth/calendar',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]));

        if (!function_exists('openssl_sign')) {
            throw new Exception("The PHP 'openssl' extension is required for Google Calendar integration. Please enable it in your PHP configuration.");
        }

        // Handle various ways the private key might be escaped (single or double backslashes)
        $key = preg_replace('/\\\\+n/', "\n", $this->private_key);
        $key = trim($key);
        
        $signature = '';
        if (!@openssl_sign("$header.$claim", $signature, $key, 'SHA256')) {
            $error = openssl_error_string();
            throw new Exception("OpenSSL signing failed. This usually means your Private Key is invalid or incorrectly formatted. Error: " . ($error ?: "Unknown OpenSSL error"));
        }
        $signature = base64_encode($signature);

        $jwt = "$header.$claim.$signature";

        $response = wp_remote_post('https://oauth2.googleapis.com/token', array(
            'body' => array(
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt
            )
        ));

        if (is_wp_error($response)) throw new Exception("Token request failed: " . $response->get_error_message());

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data) {
            throw new Exception("Failed to parse token response. Response body: " . substr($body, 0, 200));
        }

        if (isset($data['error'])) {
            $error_msg = isset($data['error_description']) ? $data['error_description'] : $data['error'];
            throw new Exception("Google Auth Error: " . $error_msg);
        }

        $this->access_token = $data['access_token'];
        return $this->access_token;
    }

    private function request($endpoint, $method = 'GET', $body = null) {
        $token = $this->get_access_token();
        $url = "https://www.googleapis.com/calendar/v3/calendars/" . urlencode($this->calendar_id) . $endpoint;

        $args = array(
            'method' => $method,
            'headers' => array(
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            )
        );

        if ($body) $args['body'] = json_encode($body);

        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) throw new Exception("API request failed: " . $response->get_error_message());

        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ($status_code >= 400) {
            $error_msg = isset($data['error']['message']) ? $data['error']['message'] : "HTTP $status_code";
            throw new Exception("Google Calendar API Error ($status_code): " . $error_msg);
        }

        return $data;
    }

    public function check_availability($start_time, $duration_hours = 2) {
        $start = new DateTime($start_time, new DateTimeZone('Asia/Karachi'));
        $end = clone $start;
        $end->modify("+$duration_hours hours");

        $endpoint = "/events?timeMin=" . urlencode($start->format(DateTime::RFC3339)) . "&timeMax=" . urlencode($end->format(DateTime::RFC3339)) . "&singleEvents=true";
        $data = $this->request($endpoint);

        return empty($data['items']);
    }

    public function book_appointment($name, $email, $package_name, $start_time) {
        $start = new DateTime($start_time, new DateTimeZone('Asia/Karachi'));
        $end = clone $start;
        $end->modify("+2 hours");

        $body = array(
            'summary' => "Booking: $name - $package_name",
            'description' => "Package: $package_name\nClient Name: $name\nClient Email: $email",
            'start' => array('dateTime' => $start->format(DateTime::RFC3339), 'timeZone' => 'Asia/Karachi'),
            'end' => array('dateTime' => $end->format(DateTime::RFC3339), 'timeZone' => 'Asia/Karachi'),
        );

        $data = $this->request("/events?sendUpdates=none", 'POST', $body);
        return array(
            'id' => isset($data['id']) ? $data['id'] : null, 
            'link' => isset($data['htmlLink']) ? $data['htmlLink'] : null
        );
    }

    public function find_appointments($name) {
        $now = new DateTime('now', new DateTimeZone('Asia/Karachi'));
        $endpoint = "/events?q=" . urlencode($name) . "&timeMin=" . urlencode($now->format(DateTime::RFC3339)) . "&singleEvents=true&orderBy=startTime";
        $data = $this->request($endpoint);

        $events = array();
        if (!empty($data['items'])) {
            foreach ($data['items'] as $item) {
                if (stripos($item['summary'], $name) !== false) {
                    $events[] = array(
                        'id' => $item['id'],
                        'summary' => $item['summary'],
                        'start' => isset($item['start']['dateTime']) ? $item['start']['dateTime'] : $item['start']['date']
                    );
                }
            }
        }
        return $events;
    }

    public function delete_appointment($id) {
        $this->request("/events/" . urlencode($id), 'DELETE');
    }

    public function update_appointment($id, $start_time) {
        $start = new DateTime($start_time, new DateTimeZone('Asia/Karachi'));
        $end = clone $start;
        $end->modify("+2 hours");

        $body = array(
            'start' => array('dateTime' => $start->format(DateTime::RFC3339), 'timeZone' => 'Asia/Karachi'),
            'end' => array('dateTime' => $end->format(DateTime::RFC3339), 'timeZone' => 'Asia/Karachi')
        );

        $this->request("/events/" . urlencode($id) . "?sendUpdates=none", 'PATCH', $body);
    }

    public function find_alternative_slots($requested_time) {
        $offsets = array(1, 2, 3, -1, -2, 24, 25, 26);
        $alternatives = array();
        $requested = new DateTime($requested_time, new DateTimeZone('Asia/Karachi'));
        $now = new DateTime('now', new DateTimeZone('Asia/Karachi'));
        
        foreach ($offsets as $offset) {
            $test = clone $requested;
            $test->modify("$offset hours");
            $hour = (int)$test->format('H');

            if ($test > $now && $hour >= 11 && $hour < 20) {
                if ($this->check_availability($test->format(DateTime::RFC3339))) {
                    $alternatives[] = $test->format('l, F j, g:i A');
                    if (count($alternatives) >= 3) break;
                }
            }
        }
        return $alternatives;
    }

    public function get_appointments() {
        $now = new DateTime('now', new DateTimeZone('Asia/Karachi'));
        $start_of_month = clone $now;
        $start_of_month->modify('-30 days');
        
        $endpoint = "/events?timeMin=" . urlencode($start_of_month->format(DateTime::RFC3339)) . "&singleEvents=true&orderBy=startTime";
        $data = $this->request($endpoint);
        
        $events = array();
        if (!empty($data['items'])) {
            foreach ($data['items'] as $item) {
                $desc = isset($item['description']) ? $item['description'] : "";
                
                // Try to extract email and package from description
                preg_match('/Client Email: (.*)/', $desc, $email_match);
                if (empty($email_match)) {
                    preg_match('/\((.*?)\)/', $desc, $email_match);
                }
                
                preg_match('/Package: (.*)/', $desc, $package_match);
                
                $name = "Unknown";
                $package_name = "Unknown";
                
                if (isset($item['summary']) && strpos($item['summary'], "Booking: ") === 0) {
                    $summary_content = str_replace("Booking: ", "", $item['summary']);
                    $parts = explode(" - ", $summary_content);
                    $name = isset($parts[0]) ? $parts[0] : "Unknown";
                    $package_name = isset($parts[1]) ? $parts[1] : "Unknown";
                }

                $events[] = array(
                    'id' => $item['id'],
                    'name' => $name,
                    'email' => isset($email_match[1]) ? trim($email_match[1]) : "Unknown",
                    'package_name' => isset($package_match[1]) ? trim($package_match[1]) : $package_name,
                    'startTime' => isset($item['start']['dateTime']) ? $item['start']['dateTime'] : $item['start']['date'],
                    'eventId' => $item['id']
                );
            }
        }
        return $events;
    }
}
