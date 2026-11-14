<script lang="ts">
	import { FileText, ListTodo, BarChart3, Video, Database, Settings } from '@lucide/svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import { clearAll } from '$lib/stores/filter';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';

	const sidebar = useSidebar();

	export let onResize: ((width: number) => void) | undefined = undefined;

	let resizing = false;
	let lastWidth = 0;

	function startResize(event: PointerEvent) {
		if (!onResize) return;
		event.preventDefault();
		resizing = true;
		const startX = event.clientX;
		const root = (event.currentTarget as HTMLElement).parentElement;
		const startWidth = root?.getBoundingClientRect().width ?? 256;
		lastWidth = startWidth;

		const onPointerMove = (moveEvent: PointerEvent) => {
			lastWidth = Math.min(384, Math.max(192, startWidth + moveEvent.clientX - startX));
			onResize?.(lastWidth);
		};
		const onPointerUp = () => {
			resizing = false;
			if (lastWidth > 0) {
				localStorage.setItem('sidebar-width', `${Math.round(lastWidth)}px`);
			}
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function resetSidebarWidth() {
		onResize?.(256);
		localStorage.setItem('sidebar-width', '16rem');
	}

	function handleLogoClick() {
		clearAll();
		goto(resolve('/'));

		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}

	function handleNavClick(href: string) {
		goto(resolve(href as Pathname));
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
</script>

<Sidebar.Root class="border-border bg-background border-r {resizing ? 'transition-none' : ''}">
	<Sidebar.Header class="border-border flex h-[73px] items-center border-b">
		<a
			href={resolve('/')}
			class="flex w-full items-center gap-3 px-4 py-3 hover:cursor-pointer"
			onclick={handleLogoClick}
		>
			<div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
				<img src="/favicon.png" alt="hei" class="h-6 w-6" />
			</div>
			<div class="grid flex-1 text-left text-sm leading-tight">
				<span class="truncate font-semibold">Hei</span>
			</div>
		</a>
	</Sidebar.Header>
	<Sidebar.Content class="flex flex-col px-2 py-3">
		<div class="flex-1 space-y-6">
			<!-- 总览 -->
			<div>
				<div class="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
					总览
				</div>
				<Sidebar.Menu class="space-y-1">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							<button
								class="hover:bg-accent/50 text-foreground flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 font-medium transition-all duration-200"
								onclick={() => handleNavClick('/')}
							>
								<div class="flex flex-1 items-center gap-3">
									<BarChart3 class="text-muted-foreground h-4 w-4" />
									<span class="text-sm">仪表盘</span>
								</div>
							</button>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							<button
								class="hover:bg-accent/50 text-foreground flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 font-medium transition-all duration-200"
								onclick={() => handleNavClick('/logs')}
							>
								<div class="flex flex-1 items-center gap-3">
									<FileText class="text-muted-foreground h-4 w-4" />
									<span class="text-sm">日志</span>
								</div>
							</button>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</div>

			<!-- 内容管理 -->
			<div>
				<div class="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
					内容管理
				</div>
				<Sidebar.Menu class="space-y-1">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							<button
								class="hover:bg-accent/50 text-foreground flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 font-medium transition-all duration-200"
								onclick={() => handleNavClick('/videos')}
							>
								<div class="flex flex-1 items-center gap-3">
									<Video class="text-muted-foreground h-4 w-4" />
									<span class="text-sm">视频</span>
								</div>
							</button>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							<button
								class="hover:bg-accent/50 text-foreground flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 font-medium transition-all duration-200"
								onclick={() => handleNavClick('/video-sources')}
							>
								<div class="flex flex-1 items-center gap-3">
									<Database class="text-muted-foreground h-4 w-4" />
									<span class="text-sm">视频源</span>
								</div>
							</button>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</div>
		</div>

		<!-- 底部系统功能 -->
		<div class="border-border mt-auto border-t pt-4">
			<Sidebar.Menu class="space-y-1">
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						<button
							class="hover:bg-accent/50 text-foreground flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 font-medium transition-all duration-200"
							onclick={() => handleNavClick('/queue')}
						>
							<div class="flex flex-1 items-center gap-3">
								<ListTodo class="text-muted-foreground h-4 w-4" />
								<span class="text-sm">任务队列</span>
							</div>
						</button>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						<button
							class="hover:bg-accent/50 text-foreground flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 font-medium transition-all duration-200"
							onclick={() => handleNavClick('/settings')}
						>
							<div class="flex flex-1 items-center gap-3">
								<Settings class="text-muted-foreground h-4 w-4" />
								<span class="text-sm">设置</span>
							</div>
						</button>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</div>
	</Sidebar.Content>
	<div
		class="absolute inset-y-0 -right-1 z-20 hidden w-2 cursor-col-resize md:block"
		role="separator"
		aria-orientation="vertical"
		aria-label="调整侧边栏宽度"
		onpointerdown={startResize}
		ondblclick={resetSidebarWidth}
	></div>
</Sidebar.Root>
