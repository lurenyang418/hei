import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { PugvCourseItem } from '$lib/types';

/**
 * 课程（pugv）域：先选讲师，再拉取其名下课程并勾选。
 * 不勾选表示下载该讲师全部课程；已添加过的课程不参与勾选。
 */
export class PugvCourseStore {
	upMid = $state('');
	upName = $state('');
	courses = $state<PugvCourseItem[]>([]);
	loading = $state(false);
	fetchAttempted = false;
	selectedSeasonIds = $state<string[]>([]);
	existingSeasonIds = $state<Set<string>>(new Set());

	/** 选中讲师后设置基础信息并清空旧课程 */
	setUp(mid: string, name: string): void {
		this.upMid = mid;
		this.upName = name;
		this.courses = [];
		this.selectedSeasonIds = [];
		this.fetchAttempted = false;
	}

	/** 拉取讲师名下全部课程 */
	async fetchCourses(): Promise<void> {
		if (!this.upMid.trim()) return;

		this.fetchAttempted = true;
		const result = await runRequest(() => api.getPugvUpCourses(this.upMid.trim()), {
			setLoading: (value) => (this.loading = value),
			context: '获取UP主课程列表失败',
			onError: () => {
				this.courses = [];
				this.selectedSeasonIds = [];
			}
		});
		if (!result) return;

		if (result.data && result.data.success) {
			this.courses = result.data.data || [];
			// 默认不勾选：不勾选即代表添加该 UP 主的全部课程
			this.selectedSeasonIds = [];
			if (this.courses.length === 0) {
				toast.warning('该UP主暂无课程', { description: '请确认搜索到的是正确的讲师账号' });
			} else {
				toast.success(`已获取到 ${this.courses.length} 门课程`, {
					description: '勾选要下载的课程，不勾选则全部下载'
				});
			}
		} else {
			this.courses = [];
			this.selectedSeasonIds = [];
		}
	}

	/** 切换某门课程的勾选状态（已添加过的课程不可选） */
	toggleSeason(seasonId: string): void {
		if (this.existingSeasonIds.has(seasonId)) return;
		if (this.selectedSeasonIds.includes(seasonId)) {
			this.selectedSeasonIds = this.selectedSeasonIds.filter((id) => id !== seasonId);
		} else {
			this.selectedSeasonIds = [...this.selectedSeasonIds, seasonId];
		}
	}

	/** 全选 / 取消全选（跳过已添加过的课程） */
	toggleAll(): void {
		const selectable = this.courses
			.map((course) => course.season_id)
			.filter((seasonId) => !this.existingSeasonIds.has(seasonId));
		if (this.selectedSeasonIds.length > 0) {
			this.selectedSeasonIds = [];
		} else {
			this.selectedSeasonIds = selectable;
		}
	}

	/** 关闭讲师课程面板 */
	clear(): void {
		this.upMid = '';
		this.upName = '';
		this.courses = [];
		this.selectedSeasonIds = [];
		this.fetchAttempted = false;
	}

	/** 提交时要用到的课程列表（未勾选则视为全部） */
	get selectedCourses(): PugvCourseItem[] {
		return this.selectedSeasonIds.length > 0
			? this.courses.filter((course) => this.selectedSeasonIds.includes(course.season_id))
			: this.courses;
	}
}
