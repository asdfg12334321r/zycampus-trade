/* ==================== Supabase 初始化 ==================== */
// 通过 CDN 引入 Supabase，在此文件中统一初始化并暴露 supabase 实例

// 推荐变量名（与提示一致）
const supabaseUrl = 'https://bgoasiasxwxbfuermxwm.supabase.co';
const supabaseAnonKey = 'sb_publishable_aieCgH5hguy14TganpPUwQ_VWiMH4K3';

// 兼容不同 CDN 全局导出（window.supabase 或 window.Supabase）
const _supabaseGlobal = window.supabase || window.Supabase;
if (!_supabaseGlobal || !_supabaseGlobal.createClient) {
	console.warn('Supabase SDK 未在 window 上找到，请确保已在 <head> 中引入 CDN 脚本。');
}

// 使用全局库的 createClient 创建客户端实例（保持命名为 supabase）
var supabase = null;
if (_supabaseGlobal && _supabaseGlobal.createClient) {
	supabase = _supabaseGlobal.createClient(supabaseUrl, supabaseAnonKey);
} else if (window.Supabase && window.Supabase.createClient) {
	supabase = window.Supabase.createClient(supabaseUrl, supabaseAnonKey);
} else {
	console.warn('无法找到 Supabase 的 createClient 方法，supabase 客户端未创建。');
}

// 导出到 window 以防其它脚本通过 window.supabase 或 window.supabaseClient 访问（兼容性）
try {
	if (supabase) {
		// 许多旧代码直接使用全局变量 `supabase` 或 `window.supabase`，这里同时兼容两者
		window.supabase = supabase;
		window.supabaseClient = supabase;
	}
} catch (e) { console.warn('无法将 supabase 挂载到 window：', e); }
