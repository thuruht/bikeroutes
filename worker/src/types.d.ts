export {}

declare global {
	interface Env {
		ADMIN_SECRET: string;
		PAYPAL_CLIENT_ID: string;
		PAYPAL_CLIENT_SECRET: string;
	}
}
