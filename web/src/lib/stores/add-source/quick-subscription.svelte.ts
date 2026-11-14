import type { ConfigResponse, VideoCategory } from '$lib/types';

/**
 * 快捷订阅路径域：按源类型保存/渲染「快捷订阅路径模板」。
 * 模板来自全局设置，本页只读；渲染结果会写入表单路径。
 */
export class QuickSubscriptionStore {
	favorite = $state('');
	collection = $state('');
	submission = $state('');
	bangumi = $state('');
	pugv = $state('');

	/** 最近一次自动写入表单的路径，用于判断用户是否手动改过 */
	lastAutoAppliedPath = $state('');

	/** 从全局配置加载五个源类型的路径模板 */
	applyFromConfig(config: ConfigResponse): void {
		this.favorite = config.favorite_quick_subscribe_path || '';
		this.collection = config.collection_quick_subscribe_path || '';
		this.submission = config.submission_quick_subscribe_path || '';
		this.bangumi = config.bangumi_quick_subscribe_path || '';
		this.pugv = config.pugv_quick_subscribe_path || '';
	}

	/** 按源类型取模板（未配置时返回空串） */
	getTemplate(type: VideoCategory): string {
		switch (type) {
			case 'favorite':
				return this.favorite;
			case 'collection':
				return this.collection;
			case 'submission':
				return this.submission;
			case 'bangumi':
				return this.bangumi;
			case 'pugv':
				return this.pugv;
			default:
				return '';
		}
	}

	/** 清洗文件名里不能出现的字符 */
	sanitizeName(value: string): string {
		// eslint-disable-next-line no-control-regex -- 文件名净化需要过滤控制字符，非笔误
		return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_');
	}

	/** 用源名称替换模板里的 {{name}} */
	renderPath(template: string, sourceName: string): string {
		const safeName = this.sanitizeName(sourceName);
		return template.replace(/\{\{\s*name\s*\}\}/g, safeName);
	}
}
