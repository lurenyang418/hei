/**
 * 源表单核心字段：源 ID、合集归属、封面与「下载全部季度」等。
 * name / path / sourceType 因与模板属性、对象键和其它对象成员同名，仍留在页面。
 */
export class SourceFormStore {
	sourceId = $state('');
	upId = $state('');
	cover = $state('');
	collectionType = $state('season');
	collectionAggregateEnabled = $state(false);
	downloadAllSeasons = $state(false);
	isManualInput = $state(false);

	/** 切换源类型或提交成功后重置这些字段 */
	reset(): void {
		this.sourceId = '';
		this.upId = '';
		this.cover = '';
		this.collectionType = 'season';
		this.collectionAggregateEnabled = false;
		this.downloadAllSeasons = false;
		this.isManualInput = false;
	}
}
