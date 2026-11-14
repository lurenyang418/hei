/** settings 页面提供给各设置域的上下文动作（跨域副作用由页面持有） */
export type SettingsPageContext = {
	/** 重新拉取整份配置，保持页面上的派生值同步 */
	reloadConfig: () => Promise<void>;
	/** 保存成功后关闭当前抽屉 */
	closeSheet: () => void;
};
