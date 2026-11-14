/**
 * 数字输入归一化：输入框可能是空串 / 非数字，统一兜底成默认值。
 */
export function normalizeNumberInput(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed) {
			const parsed = Number(trimmed);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}
	}

	return fallback;
}

/**
 * 并发类输入归一化：可能是空串 / 0 / 负数，统一兜成默认值，避免界面上算出 NaN 或 0。
 */
export function normalizeConcurrencyValue(value: unknown, fallback: number): number {
	const parsed = normalizeNumberInput(value, fallback);
	return parsed > 0 ? parsed : fallback;
}
