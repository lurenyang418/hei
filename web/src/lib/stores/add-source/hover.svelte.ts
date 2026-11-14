import type { BangumiSeasonInfo, HoveredItem, SearchResultItem } from '$lib/types';

/**
 * 悬停详情域：记录当前悬停项与浮层坐标，带 rAF 节流。
 * 抽屉/卡片只调用 show / move / hide，浮层坐标计算集中在 store 内。
 */
export class HoverTooltipStore {
	item = $state<HoveredItem | null>(null);
	position = $state({ x: 0, y: 0 });

	#raf: number | null = null;
	#pending: { pageX: number; pageY: number } | null = null;

	show(
		type: HoveredItem['type'],
		data: SearchResultItem | BangumiSeasonInfo,
		event: MouseEvent
	): void {
		this.item = { type, data } as HoveredItem;
		this.#schedule(event.pageX, event.pageY, true);
	}

	move(event: MouseEvent): void {
		if (!this.item) return;
		this.#schedule(event.pageX, event.pageY);
	}

	hide(): void {
		this.item = null;
		this.#pending = null;
		if (this.#raf !== null) {
			cancelAnimationFrame(this.#raf);
			this.#raf = null;
		}
	}

	destroy(): void {
		this.hide();
	}

	#schedule(pageX: number, pageY: number, immediate = false): void {
		this.#pending = { pageX, pageY };

		if (immediate) {
			this.#updatePosition(pageX, pageY);
			return;
		}

		if (this.#raf !== null) return;
		this.#raf = requestAnimationFrame(() => {
			this.#raf = null;
			if (this.item && this.#pending) {
				this.#updatePosition(this.#pending.pageX, this.#pending.pageY);
			}
		});
	}

	#updatePosition(pageX: number, pageY: number): void {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const tooltipWidth = 400; // 预估悬浮窗宽度
		const tooltipHeight = 300; // 预估悬浮窗高度

		let x = pageX + 20;
		let y = pageY - 100;

		// 防止悬浮窗超出右边界
		if (x + tooltipWidth > viewportWidth) {
			x = pageX - tooltipWidth - 20;
		}

		// 防止悬浮窗超出下边界
		if (y + tooltipHeight > viewportHeight) {
			y = pageY - tooltipHeight - 20;
		}

		// 防止悬浮窗超出上边界和左边界
		this.position = {
			x: Math.max(10, x),
			y: Math.max(10, y)
		};
	}
}
