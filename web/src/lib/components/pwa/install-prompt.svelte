<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Download, X } from '@lucide/svelte';
	import { SvelteDate } from 'svelte/reactivity';

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showBanner = $state(false);
	let isInstalled = $state(false);

	function isDismissed() {
		const expiry = localStorage.getItem('pwa-install-dismissed-expiry');
		if (expiry && Date.parse(expiry) > Date.now()) return true;
		localStorage.removeItem('pwa-install-dismissed');
		localStorage.removeItem('pwa-install-dismissed-expiry');
		return false;
	}

	// 检查是否已经安装
	function checkIfInstalled() {
		// 检查是否在standalone模式下运行（已安装）
		if (window.matchMedia('(display-mode: standalone)').matches) {
			isInstalled = true;
			return;
		}

		// 检查iOS Safari
		if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
			isInstalled = true;
			return;
		}
	}

	onMount(() => {
		checkIfInstalled();

		// 监听beforeinstallprompt事件
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;

			// 如果用户之前没有拒绝，则显示安装横幅
			if (!isDismissed() && !isInstalled) {
				showBanner = true;
			}
		};

		// 监听appinstalled事件
		const handleAppInstalled = () => {
			showBanner = false;
			isInstalled = true;
			deferredPrompt = null;
			toast.success('应用已成功安装到桌面！');
			localStorage.removeItem('pwa-install-dismissed');
			localStorage.removeItem('pwa-install-dismissed-expiry');
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	});

	async function handleInstall() {
		if (!deferredPrompt) {
			toast.error('安装功能暂不可用');
			return;
		}

		const prompt = deferredPrompt;
		deferredPrompt = null;
		showBanner = false;
		try {
			await prompt.prompt();
			const { outcome } = await prompt.userChoice;
			if (outcome === 'dismissed') dismissBanner();
		} catch {
			toast.error('安装失败，请通过浏览器菜单添加到主屏幕');
		}
	}

	function dismissBanner() {
		showBanner = false;
		// 记住用户已经关闭过横幅，7天内不再显示
		const expiryDate = new SvelteDate();
		expiryDate.setDate(expiryDate.getDate() + 7);
		localStorage.setItem('pwa-install-dismissed-expiry', expiryDate.toISOString());
	}
</script>

{#if showBanner && !isInstalled}
	<div
		class="animate-in slide-in-from-bottom-5 fixed right-4 bottom-4 left-4 z-50 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg md:right-4 md:left-auto md:w-96 dark:border-zinc-800 dark:bg-zinc-900"
	>
		<div class="flex items-start gap-3">
			<div
				class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"
			>
				<Download class="h-5 w-5 text-white" />
			</div>

			<div class="min-w-0 flex-1">
				<h3 class="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">安装应用</h3>
				<p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
					将应用添加到桌面，获得更好的使用体验
				</p>

				<div class="flex gap-2">
					<button
						onclick={handleInstall}
						class="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						安装
					</button>
					<button
						onclick={dismissBanner}
						class="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
					>
						稍后
					</button>
				</div>
			</div>

			<button
				onclick={dismissBanner}
				aria-label="关闭安装提示"
				class="flex-shrink-0 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
