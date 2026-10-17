<?php
/**
 * Settings → Realitin AR: connection to the Realitin service.
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

class Realitin_AR_Settings {

	const PAGE = 'realitin-ar';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	public static function menu() {
		add_options_page( 'Realitin AR', 'Realitin AR', 'manage_options', self::PAGE, array( __CLASS__, 'render' ) );
	}

	public static function register() {
		register_setting(
			self::PAGE,
			Realitin_AR_Service::OPTION_URL,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'esc_url_raw',
				'default'           => '',
			)
		);
		register_setting(
			self::PAGE,
			Realitin_AR_Service::OPTION_KEY,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( __CLASS__, 'sanitize_key_field' ),
				'default'           => '',
			)
		);
	}

	/**
	 * Keeps the stored key when the field is left empty (the key is never printed back).
	 *
	 * @param string $value Submitted key.
	 */
	public static function sanitize_key_field( $value ) {
		$value = trim( sanitize_text_field( (string) $value ) );
		return '' === $value ? (string) get_option( Realitin_AR_Service::OPTION_KEY, '' ) : $value;
	}

	public static function render() {
		$url_locked = defined( 'REALITIN_AR_SERVICE_URL' );
		$key_locked = defined( 'REALITIN_AR_API_KEY' );
		$has_key    = '' !== Realitin_AR_Service::api_key();
		?>
		<div class="wrap">
			<h1>Realitin AR</h1>
			<p><?php esc_html_e( 'Connect the Realitin service to generate 3D models from product images.', 'realitin-ar' ); ?></p>
			<form method="post" action="options.php">
				<?php settings_fields( self::PAGE ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="realitin-ar-url"><?php esc_html_e( 'Service URL', 'realitin-ar' ); ?></label></th>
						<td>
							<input type="url" class="regular-text" id="realitin-ar-url" name="<?php echo esc_attr( Realitin_AR_Service::OPTION_URL ); ?>" value="<?php echo esc_attr( Realitin_AR_Service::url() ); ?>" <?php disabled( $url_locked ); ?> />
							<?php if ( $url_locked ) : ?>
								<p class="description"><?php esc_html_e( 'Set in wp-config.php.', 'realitin-ar' ); ?></p>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="realitin-ar-key"><?php esc_html_e( 'API key', 'realitin-ar' ); ?></label></th>
						<td>
							<input type="password" class="regular-text" id="realitin-ar-key" name="<?php echo esc_attr( Realitin_AR_Service::OPTION_KEY ); ?>" value="" autocomplete="off" <?php disabled( $key_locked ); ?> />
							<p class="description">
								<?php
								if ( $key_locked ) {
									esc_html_e( 'Set in wp-config.php.', 'realitin-ar' );
								} elseif ( $has_key ) {
									esc_html_e( 'A key is saved. Leave empty to keep it.', 'realitin-ar' );
								} else {
									esc_html_e( 'No key saved.', 'realitin-ar' );
								}
								?>
							</p>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
