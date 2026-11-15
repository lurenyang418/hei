import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png'],
			manifest: {
				name: '管理面板',
				short_name: 'hei',
				lang: 'zh-CN',
				description: 'B站视频同步下载管理工具',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				orientation: 'any',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					}
				]
			},
			workbox: {
				// 仅预缓存前端构建资源；API、图片代理和视频流直接访问网络。
				// 排除不需要缓存的资源
				navigateFallback: null,
				// 清理过期缓存
				cleanupOutdatedCaches: true
			}
		})
	],
	server: {
		proxy: {
			'/api': 'http://localhost:12345'
		}
	}
});
