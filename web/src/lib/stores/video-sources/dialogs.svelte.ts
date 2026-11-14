/**
 * video-sources 页面的六组弹窗状态：开关 + 当前操作对象。
 * 只存展示所需的数据，弹窗内的业务逻辑仍由页面处理函数负责。
 */
export class VideoSourceDialogsStore {
	deleteOpen = $state(false);
	deleteInfo = $state({ type: '', id: 0, name: '' });

	resetPathOpen = $state(false);
	resetPathInfo = $state({ type: '', id: 0, name: '', currentPath: '' });

	submissionSelectionOpen = $state(false);
	submissionSelectionInfo = $state({
		id: 0,
		upperId: 0,
		upperName: '',
		selectedVideos: [] as string[]
	});

	keywordFilterOpen = $state(false);
	keywordFilterInfo = $state({ type: '', id: 0, name: '' });

	aiPromptOpen = $state(false);
	aiPromptInfo = $state({
		type: '',
		id: 0,
		name: '',
		videoPrompt: '',
		audioPrompt: '',
		aiRename: false,
		enableMultiPage: false,
		enableCollection: false,
		enableBangumi: false,
		renameParentDir: false
	});

	aiRenameHistoryOpen = $state(false);
	aiRenameHistoryInfo = $state({
		type: '',
		id: 0,
		name: '',
		videoPrompt: '',
		audioPrompt: '',
		enableMultiPage: false,
		enableCollection: false,
		enableBangumi: false,
		renameParentDir: false
	});
}
