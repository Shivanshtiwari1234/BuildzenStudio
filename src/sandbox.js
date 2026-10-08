const SANDBOX_ENDPOINT = "/api/sandboxes";

export function createSandboxController({ onStatus, onSandbox }) {
	let currentSandbox = null;

	async function request(path = "", options = {}) {
		const response = await fetch(`${SANDBOX_ENDPOINT}${path}`, {
			credentials: "same-origin",
			...options,
			headers: {
				"Content-Type": "application/json",
				"X-Buildzen-Sandbox-Action": "1",
				...options.headers
			}
		});

		const result = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(result.detail || "Sandbox service unavailable");
		}
		return result;
	}

	function applySandbox(sandbox) {
		currentSandbox = sandbox || null;
		onSandbox(currentSandbox);
		onStatus(currentSandbox ? "API running" : "API stopped");
	}

	return {
		async refresh() {
			try {
				const result = await request("/me");
				applySandbox(result.sandbox);
			} catch {
				onStatus("Sandbox unavailable");
				onSandbox(null);
			}
		},

		async start(files) {
			onStatus("Starting API...");
			const result = await request("", {
				method: "POST",
				body: JSON.stringify({
					command: "start-fastapi",
					files
				})
			});
			applySandbox(result.sandbox);
			return currentSandbox;
		},

		async stop() {
			if (!currentSandbox) return;
			onStatus("Stopping API...");
			await request(`/${encodeURIComponent(currentSandbox.id)}`, {
				method: "DELETE"
			});
			applySandbox(null);
		}
	};
}
