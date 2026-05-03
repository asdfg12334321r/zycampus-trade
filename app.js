/* ==================== Supabase 实例由 js/supabase.js 提供 ==================== */
// supabase 变量由页面中优先加载的 js/supabase.js 初始化，此处直接使用

// ==================== 全局状态 ====================
let currentData = [];   // 当前渲染的数据
let currentMode = '';   // 'items' | 'orders' | 'users'

// ==================== 身份管理 ====================

/**
 * 当前登录用户
 * 'admin' 表示管理员，'u001'~'u004' 表示普通用户
 * 使用 sessionStorage 跨页面保持选择
 */
let currentUser = sessionStorage.getItem('currentUser') || 'admin';

/** 管理员密码（前端演示用） */
const ADMIN_PASSWORD = '123456';

/**
 * 切换身份：更新全局变量、同步 sessionStorage、同步所有页面下拉框、刷新当前页面内容
 * 切换到管理员时弹出密码验证弹窗
 */
function switchIdentity(userId) {
    if (userId === 'admin') {
        // 先把下拉框复原到当前身份，等密码验证通过再正式切换
        const sel = document.getElementById('identitySelect');
        if (sel) sel.value = currentUser;
        showAdminPasswordModal();
        return;
    }
    _applyIdentity(userId);
}

/** 显示管理员密码验证弹窗 */
function showAdminPasswordModal() {
    // 防止重复创建
    if (document.getElementById('adminModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'adminModalOverlay';
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
        <div class="admin-modal">
            <h3>🔐 管理员验证</h3>
            <p>请输入管理员密码以切换身份</p>
            <input type="password" id="adminPwdInput" placeholder="请输入密码" autocomplete="off" />
            <label class="show-pwd-label">
                <input type="checkbox" id="adminShowPwd" onchange="toggleAdminPwdVisible(this)" />
                <span>显示密码</span>
            </label>
            <div class="admin-modal-error" id="adminPwdError"></div>
            <div class="admin-modal-btns">
                <button class="btn-confirm" onclick="confirmAdminPassword()">确认</button>
                <button class="btn-cancel"  onclick="closeAdminModal()">取消</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    // 自动聚焦
    setTimeout(() => document.getElementById('adminPwdInput')?.focus(), 60);
    // 回车确认（绑定密码输入框）
    overlay.querySelector('#adminPwdInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmAdminPassword();
        if (e.key === 'Escape') closeAdminModal();
    });
}

/** 验证管理员密码 */
function confirmAdminPassword() {
    const input = document.getElementById('adminPwdInput');
    const errEl = document.getElementById('adminPwdError');
    if (!input) return;
    if (input.value === ADMIN_PASSWORD) {
        closeAdminModal();
        _applyIdentity('admin');
    } else {
        errEl.textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
        // 抖动动画
        input.style.animation = 'none';
        requestAnimationFrame(() => { input.style.animation = 'shake 0.3s ease'; });
    }
}

/** 关闭管理员密码弹窗，恢复下拉框到当前身份 */
function closeAdminModal() {
    const overlay = document.getElementById('adminModalOverlay');
    if (overlay) overlay.remove();
    // 确保下拉框与实际 currentUser 一致
    const sel = document.getElementById('identitySelect');
    if (sel) sel.value = currentUser;
}

/** 切换密码显示/隐藏（checkbox 版） */
function toggleAdminPwdVisible(checkbox) {
    const input = document.getElementById('adminPwdInput');
    if (!input) return;
    input.type = checkbox.checked ? 'text' : 'password';
}

/** 内部：真正执行身份切换 */
function _applyIdentity(userId) {
    currentUser = userId;
    sessionStorage.setItem('currentUser', userId);
    const sel = document.getElementById('identitySelect');
    if (sel) sel.value = userId;
    applyIdentityToPage();
    showMessage(`已切换为：${userId === 'admin' ? '👑 管理员' : '👤 ' + userId}`, 'info');
}

/** 是否是管理员 */
function isAdmin() { return currentUser === 'admin'; }

/** 是否是普通用户 */
function isUser() { return currentUser !== 'admin'; }

/**
 * 检查是否允许操作某件商品
 * - 管理员：始终允许
 * - 普通用户：只能操作自己发布的商品
 */
function canEditItem(sellerId) {
    return isAdmin() || currentUser === sellerId;
}

/**
 * 检查是否允许购买某件商品
 * - 管理员：允许（模拟任意身份操作）
 * - 普通用户：不能购买自己发布的商品
 */
function canBuyItem(sellerId) {
    return isAdmin() || currentUser !== sellerId;
}

/**
 * 页面加载/切换身份后，同步下拉框选中项并刷新页面权限状态
 */
function applyIdentityToPage() {
    // 同步下拉框
    const sel = document.getElementById('identitySelect');
    if (sel && sel.value !== currentUser) sel.value = currentUser;
    // 刷新商品列表（若在商品页）
    if (document.getElementById('contentContainer') && currentMode === 'items') {
        renderByMode(currentData);
    }
    // 刷新数据操作卡片（若在商品页）
    refreshOpsCard();
}

/**
 * 根据当前身份刷新「数据操作」卡片内容
 * - 管理员：显示所有操作
 * - 普通用户：插入商品时自动填充卖家ID，修改/删除只对自己的商品有效（提示说明）
 */
function refreshOpsCard() {
    const newSellerInput = document.getElementById('newItemSeller');
    if (newSellerInput) {
        if (isUser()) {
            newSellerInput.value = currentUser;
            newSellerInput.readOnly = true;
            newSellerInput.style.background = '#f0f0f0';
            newSellerInput.title = '普通用户只能以自己的ID发布商品';
        } else {
            newSellerInput.readOnly = false;
            newSellerInput.style.background = '';
            newSellerInput.title = '';
        }
    }
}

// ==================== 工具函数 ====================

function showMessage(text, type = 'info') {
    // ── error / warning → 屏幕居中浮窗，5s 自动消失 ──
    if (type === 'error' || type === 'warning') {
        let container = document.getElementById('__toastCenter');
        if (!container) {
            container = document.createElement('div');
            container.id = '__toastCenter';
            container.className = 'toast-container toast-container-center';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast-msg toast-${type}`;
        toast.innerHTML = `
            <span class="toast-text">${text}</span>
            <button class="toast-close" onclick="this.closest('.toast-msg').remove()">✕</button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-hiding');
            setTimeout(() => toast.remove(), 220);
        }, 5000);
        return;
    }

    // ── success / info → 页面内绿色横条（导航下方 #message 元素）──
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = text;
    el.className = `msg-bar msg-bar-${type} msg-bar-show`;
    clearTimeout(el._msgTimer);
    // 不自动消失，用户滚动或离开即可；如需消失可取消下方注释
    // el._msgTimer = setTimeout(() => el.classList.remove('msg-bar-show'), 4000);
}

function showLoading(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>加载中…</p></div>`;
}

function formatDate(d) {
    if (!d || d === '-') return '-';
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString('zh-CN');
}

/** 解包 Supabase 关联对象（兼容对象/数组两种返回格式）*/
function unpack(val) {
    if (!val) return null;
    return Array.isArray(val) ? (val[0] ?? null) : val;
}

// ==================== 搜索 ====================

function doSearch() {
    const kw = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    if (!kw) { renderByMode(currentData); return; }
    const filtered = currentData.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(kw))
    );
    renderByMode(filtered, true);
    showMessage(`搜索"${kw}"：找到 ${filtered.length} 条`, 'info');
}

function renderByMode(data, silent = false) {
    if (currentMode === 'items')  renderItemsTable(data, 'contentContainer', silent);
    if (currentMode === 'orders') renderOrdersTable(data, 'contentContainer', silent);
    if (currentMode === 'users')  renderUsersTable(data, 'contentContainer', silent);
}

// ==================== 基础查询：多维度 Tag 筛选 ====================

/**
 * 初始化筛选 tag：从数据库动态拉取所有分类和用户，填充 tag 行
 * 在 DOMContentLoaded 时调用
 */
async function initFilterTags() {
    try {
        const [{ data: items }, { data: users }] = await Promise.all([
            supabase.from('item').select('category, seller_id'),
            supabase.from('user').select('user_id, user_name')
        ]);

        // 分类 tag
        const cats = [...new Set((items || []).map(i => i.category).filter(Boolean))].sort();
        const catContainer = document.getElementById('filter-category');
        if (catContainer) {
            cats.forEach(cat => {
                const sp = document.createElement('span');
                sp.className = 'ftag';
                sp.dataset.dim = 'category';
                sp.dataset.val = cat;
                sp.textContent = cat;
                sp.onclick = function() { toggleFilterTag(this); };
                catContainer.appendChild(sp);
            });
        }

        // 用户 tag（显示用户名，值用 user_id）
        const userMap = Object.fromEntries((users || []).map(u => [u.user_id, u.user_name || u.user_id]));
        const sellerIds = [...new Set((items || []).map(i => i.seller_id).filter(Boolean))].sort();
        const sellerContainer = document.getElementById('filter-seller');
        if (sellerContainer) {
            sellerIds.forEach(sid => {
                const sp = document.createElement('span');
                sp.className = 'ftag';
                sp.dataset.dim = 'seller';
                sp.dataset.val = sid;
                sp.textContent = userMap[sid] ? `${userMap[sid]}（${sid}）` : sid;
                sp.onclick = function() { toggleFilterTag(this); };
                sellerContainer.appendChild(sp);
            });
        }
    } catch (e) {
        console.warn('initFilterTags 失败:', e.message);
    }
}

/**
 * 点击 tag 时切换选中状态（同一维度单选）
 */
function toggleFilterTag(el) {
    const dim = el.dataset.dim;
    // 同维度其他 tag 全部取消
    document.querySelectorAll(`.ftag[data-dim="${dim}"]`).forEach(t => t.classList.remove('ftag-active'));
    el.classList.add('ftag-active');
    // 更新摘要
    updateFilterSummary();
}

/**
 * 读取当前各维度选中值
 */
function getFilterValues() {
    const get = dim => {
        const el = document.querySelector(`.ftag-active[data-dim="${dim}"]`);
        return el ? el.dataset.val : '';
    };
    return {
        status:   get('status'),
        price:    get('price'),
        category: get('category'),
        seller:   get('seller')
    };
}

/**
 * 更新底部文字摘要
 */
function updateFilterSummary() {
    const { status, price, category, seller } = getFilterValues();
    const parts = [];
    if (status === '0') parts.push('出售中');
    else if (status === '1') parts.push('已售出');
    if (price) {
        const labels = { '0-30': '¥0–30', '30-100': '¥30–100', '100-300': '¥100–300', '300-': '¥300以上' };
        parts.push(labels[price] || price);
    }
    if (category) parts.push(category);
    if (seller) {
        const el = document.querySelector(`.ftag-active[data-dim="seller"]`);
        parts.push(el ? el.textContent : seller);
    }
    const el = document.getElementById('filterSummary');
    if (el) el.textContent = parts.length ? `当前筛选：${parts.join(' · ')}` : '';
}

/**
 * 执行多维度组合查询
 */
async function runFilterQuery() {
    showLoading('contentContainer');
    try {
        const { status, price, category, seller } = getFilterValues();

        let query = supabase.from('item').select('*');

        // 售卖情况
        if (status !== '') query = query.eq('status', parseInt(status));

        // 价格区间
        if (price === '0-30')    { query = query.gte('price', 0).lte('price', 30); }
        else if (price === '30-100')  { query = query.gt('price', 30).lte('price', 100); }
        else if (price === '100-300') { query = query.gt('price', 100).lte('price', 300); }
        else if (price === '300-')    { query = query.gt('price', 300); }

        // 商品类别
        if (category) query = query.eq('category', category);

        // 发布用户
        if (seller) query = query.eq('seller_id', seller);

        query = query.order('item_id');

        const { data, error } = await query;
        if (error) throw error;

        renderItemsTable(data, 'contentContainer');

        // 构造描述文本
        const { status: sv, price: pv, category: cv, seller: sev } = getFilterValues();
        const descs = [];
        if (sv === '0') descs.push('出售中');
        else if (sv === '1') descs.push('已售出');
        const priceLabels = { '0-30': '¥0–30', '30-100': '¥30–100', '100-300': '¥100–300', '300-': '¥300以上' };
        if (pv) descs.push(priceLabels[pv] || pv);
        if (cv) descs.push(cv);
        if (sev) {
            const el = document.querySelector(`.ftag-active[data-dim="seller"]`);
            descs.push(el ? el.textContent : sev);
        }
        const desc = descs.length ? descs.join(' · ') : '全部';
        showMessage(`✅ 查询「${desc}」，共 ${data.length} 件商品`, 'success');

    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

/**
 * 重置所有筛选项到默认（全部 / 不限）
 */
function resetFilterQuery() {
    ['status', 'price', 'category', 'seller'].forEach(dim => {
        // 让第一个 tag（全部/不限）激活
        const tags = document.querySelectorAll(`.ftag[data-dim="${dim}"]`);
        tags.forEach((t, i) => t.classList.toggle('ftag-active', i === 0));
    });
    updateFilterSummary();
    showAllItems();
}

// ==================== 商品查询 ====================

async function showAllItems() {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').order('item_id');
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`共 ${data.length} 件商品`, 'success');
    } catch (e) { showMessage('加载失败: ' + e.message, 'error'); }
}

async function queryAllUnsoldItems() {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').eq('status', 0).order('item_id');
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`未售商品：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryItemsAbovePrice() {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').gt('price', 30).order('price', { ascending: false });
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`价格 > ¥30：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryDailyGoodsItems() {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').eq('category', 'DailyGoods').order('item_id');
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`生活用品：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryItemsByUser(userId) {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').eq('seller_id', userId).order('item_id');
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`${userId} 共发布 ${data.length} 件商品`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryViewSoldItems() {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').eq('status', 1).order('item_id');
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`已售商品视图：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryViewUnsoldItems() {
    showLoading('contentContainer');
    try {
        const { data, error } = await supabase.from('item').select('*').eq('status', 0).order('item_id');
        if (error) throw error;
        renderItemsTable(data, 'contentContainer');
        showMessage(`未售商品视图：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

/**
 * 根据商品状态和当前身份渲染操作按钮
 * - 已售出：禁用按钮
 * - 出售中且能购买：显示购买按钮
 * - 是卖家且是管理员：显示编辑按钮（仅限管理员可编辑他人商品）
 * - 是卖家且不是管理员：显示编辑按钮（普通用户只能编辑自己的）
 */
function renderItemAction(item) {
    if (item.status !== 0) {
        // 已售出
        return `<button class="btn btn-sm btn-secondary" disabled>已售出</button>`;
    }
    
    // 出售中
    const html = [];
    
    // 购买按钮：若能购买则显示
    if (canBuyItem(item.seller_id)) {
        html.push(
            `<button class="btn btn-sm btn-success btn-buy" onclick="buyItem('${item.item_id}','${item.item_name.replace(/'/g,"\\'")}',${item.price})">🛒 购买</button>`
        );
    } else {
        // 是卖家，普通用户不能自购
        html.push(
            `<button class="btn btn-sm btn-secondary" disabled title="不能购买自己的商品">自己的商品</button>`
        );
    }
    
    return html.join('');
}

function renderItemsTable(items, containerId, silent = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!silent) { currentData = items || []; currentMode = 'items'; }
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>暂无商品数据</p></div>`;
        return;
    }
    let html = `<div class="table-wrapper"><table class="table table-hover">
        <thead><tr>
            <th>商品ID</th><th>商品名称</th><th>分类</th>
            <th>价格</th><th>状态</th><th>卖家ID</th><th>操作</th>
        </tr></thead><tbody>`;
    items.forEach(item => {
        const badge = item.status === 0
            ? '<span class="badge badge-green">出售中</span>'
            : '<span class="badge badge-red">已售出</span>';
        html += `<tr>
            <td><code>${item.item_id}</code></td>
            <td><strong>${item.item_name}</strong></td>
            <td><span class="tag">${item.category}</span></td>
            <td class="cell-price">¥${parseFloat(item.price).toFixed(2)}</td>
            <td>${badge}</td>
            <td><code>${item.seller_id}</code></td>
            <td>${renderItemAction(item)}</td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ==================== 商品统计栏 ====================

async function loadItemStats() {
    const el = document.getElementById('statsBar');
    if (!el) return;
    try {
        const [r1, r2, r3, r4, r5] = await Promise.all([
            supabase.from('item').select('*', { count: 'exact', head: true }),
            supabase.from('item').select('*', { count: 'exact', head: true }).eq('status', 0),
            supabase.from('item').select('*', { count: 'exact', head: true }).eq('status', 1),
            supabase.from('item').select('price'),
            supabase.from('item').select('category')
        ]);
        const total = r1.count || 0, unsold = r2.count || 0, sold = r3.count || 0;
        const prices = r4.data || [];
        const avg = prices.length ? (prices.reduce((s, i) => s + i.price, 0) / prices.length).toFixed(2) : '0.00';

        const cats = {};
        (r5.data || []).forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
        const catHtml = Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => `<span class="cat-chip"><b>${n}</b> ${c}</span>`).join('');

        el.innerHTML = `<div class="stats-pills">
            <span class="stat-pill">📦 总数 <strong>${total}</strong></span>
            <span class="stat-pill pill-green">🟢 出售中 <strong>${unsold}</strong></span>
            <span class="stat-pill pill-red">🔴 已售 <strong>${sold}</strong></span>
            <span class="stat-pill pill-blue">💰 均价 <strong>¥${avg}</strong></span>
        </div>
        <div class="cats-row">${catHtml}</div>`;
    } catch (e) { el.innerHTML = ''; }
}

// ==================== 用户查询 ====================

async function showAllUsers() {
    showLoading('contentContainer');
    try {
        const [{ data: users, error }, { data: items }] = await Promise.all([
            supabase.from('user').select('user_id, user_name, phone'),
            supabase.from('item').select('seller_id')
        ]);
        if (error) throw error;
        const cnt = {};
        (items || []).forEach(i => { cnt[i.seller_id] = (cnt[i.seller_id] || 0) + 1; });
        const rows = (users || []).map(u => ({ ...u, item_count: cnt[u.user_id] || 0 }));
        renderUsersTable(rows, 'contentContainer');
        showMessage(`共 ${rows.length} 个用户`, 'success');
    } catch (e) { showMessage('加载失败: ' + e.message, 'error'); }
}

async function queryMostActiveUser() {
    showLoading('contentContainer');
    try {
        const [{ data: users, error }, { data: items }] = await Promise.all([
            supabase.from('user').select('user_id, user_name, phone'),
            supabase.from('item').select('seller_id')
        ]);
        if (error) throw error;
        const cnt = {};
        (items || []).forEach(i => { cnt[i.seller_id] = (cnt[i.seller_id] || 0) + 1; });
        const rows = (users || [])
            .map(u => ({ ...u, item_count: cnt[u.user_id] || 0 }))
            .sort((a, b) => b.item_count - a.item_count);
        renderUsersTable(rows, 'contentContainer');
        if (rows[0]) showMessage(`发布最多：${rows[0].user_name}，共 ${rows[0].item_count} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

function renderUsersTable(users, containerId, silent = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!silent) { currentData = users || []; currentMode = 'users'; }
    if (!users || users.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">👤</span><p>暂无用户数据</p></div>`;
        return;
    }
    let html = `<div class="table-wrapper"><table class="table table-hover">
        <thead><tr><th>用户ID</th><th>用户名</th><th>电话</th><th>发布商品数</th></tr></thead><tbody>`;
    users.forEach(u => {
        html += `<tr>
            <td><code>${u.user_id}</code></td>
            <td><strong>${u.user_name}</strong></td>
            <td>${u.phone || '-'}</td>
            <td><span class="badge badge-blue">${u.item_count || 0} 件</span></td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ==================== 订单查询（核心：手动两步查询，彻底避免关联字段问题） ====================

/**
 * 通用订单查询：先查 orders，再分别查 item 和 user，最后手动拼接
 * @param {function|null} filterFn  可选的额外过滤函数，接收 orders 数组
 */
async function fetchOrdersFull(filterFn = null) {
    // 1. 查订单基础数据
    const { data: orders, error: oe } = await supabase
        .from('orders')
        .select('order_id, item_id, buyer_id, order_date')
        .order('order_date', { ascending: false });
    if (oe) throw oe;
    const ordersArr = filterFn ? filterFn(orders || []) : (orders || []);
    if (ordersArr.length === 0) return [];

    // 2. 收集 item_id 和 buyer_id，批量查询
    const itemIds  = [...new Set(ordersArr.map(o => o.item_id).filter(Boolean))];
    const buyerIds = [...new Set(ordersArr.map(o => o.buyer_id).filter(Boolean))];

    const [itemRes, buyerRes] = await Promise.all([
        itemIds.length  ? supabase.from('item').select('item_id, item_name, price, seller_id').in('item_id', itemIds)  : { data: [] },
        buyerIds.length ? supabase.from('user').select('user_id, user_name').in('user_id', buyerIds)                   : { data: [] }
    ]);

    // 3. 收集 seller_id，再查卖家名
    const itemMap  = Object.fromEntries((itemRes.data  || []).map(i => [i.item_id,  i]));
    const buyerMap = Object.fromEntries((buyerRes.data || []).map(u => [u.user_id, u]));

    const sellerIds = [...new Set(Object.values(itemMap).map(i => i.seller_id).filter(Boolean))];
    let sellerMap = {};
    if (sellerIds.length) {
        const { data: sellers } = await supabase.from('user').select('user_id, user_name').in('user_id', sellerIds);
        sellerMap = Object.fromEntries((sellers || []).map(s => [s.user_id, s.user_name]));
    }

    // 4. 拼接
    return ordersArr.map(o => {
        const item   = itemMap[o.item_id]  || {};
        const buyer  = buyerMap[o.buyer_id] || {};
        return {
            order_id:    o.order_id,
            item_name:   item.item_name   || o.item_id,
            price:       item.price       ?? '-',
            buyer_name:  buyer.user_name  || o.buyer_id,
            seller_name: sellerMap[item.seller_id] || item.seller_id || '-',
            order_date:  o.order_date
        };
    });
}

async function showAllOrders() {
    showLoading('contentContainer');
    try {
        const rows = await fetchOrdersFull();
        renderOrdersTable(rows, 'contentContainer');
        showMessage(`共 ${rows.length} 笔订单`, 'success');
    } catch (e) { showMessage('加载失败: ' + e.message, 'error'); }
}

async function querySoldItemsWithBuyer() {
    showLoading('contentContainer');
    try {
        const rows = await fetchOrdersFull();
        renderOrdersTable(rows, 'contentContainer');
        showMessage(`已售商品及买家：${rows.length} 笔`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryOrdersDetail() {
    showLoading('contentContainer');
    try {
        const rows = await fetchOrdersFull();
        renderOrdersTable(rows, 'contentContainer');
        showMessage(`订单详情（商品+买家+卖家+日期）：${rows.length} 笔`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

async function queryU001SoldStatus() {
    // 兼容旧调用，直接委托给泛化版
    return queryUserSoldStatus('u001');
}

/**
 * 按发布用户查询商品购买情况（泛化版）
 * @param {string} userId  卖家 user_id
 */
async function queryUserSoldStatus(userId) {
    showLoading('contentContainer');
    try {
        // 先获取该用户信息（用于显示用户名）
        const [{ data: userInfo }, { data: items, error }] = await Promise.all([
            supabase.from('user').select('user_name').eq('user_id', userId).maybeSingle(),
            supabase.from('item').select('item_id, item_name, price, status').eq('seller_id', userId)
        ]);
        if (error) throw error;

        const userName = userInfo?.user_name || userId;
        if (!items?.length) {
            showMessage(`${userName}（${userId}）未发布任何商品`, 'info');
            document.getElementById('contentContainer').innerHTML =
                `<div class="empty-state"><span class="empty-icon">📭</span><p>${userName} 暂无发布商品</p></div>`;
            return;
        }

        const ids = items.map(i => i.item_id);
        const { data: orderData } = await supabase
            .from('orders').select('order_id, item_id, buyer_id, order_date').in('item_id', ids);

        // 批量查买家名
        const buyerIds = [...new Set((orderData || []).map(o => o.buyer_id).filter(Boolean))];
        let buyerMap = {};
        if (buyerIds.length) {
            const { data: buyers } = await supabase.from('user').select('user_id, user_name').in('user_id', buyerIds);
            buyerMap = Object.fromEntries((buyers || []).map(b => [b.user_id, b.user_name]));
        }

        const orderMap = {};
        (orderData || []).forEach(o => {
            if (!orderMap[o.item_id]) orderMap[o.item_id] = [];
            orderMap[o.item_id].push(o);
        });

        const result = items.flatMap(item => {
            const os = orderMap[item.item_id];
            if (os?.length) {
                return os.map(o => ({
                    order_id:    o.order_id,
                    item_name:   item.item_name,
                    price:       item.price,
                    buyer_name:  buyerMap[o.buyer_id] || o.buyer_id,
                    seller_name: userName,
                    order_date:  o.order_date
                }));
            }
            return [{ order_id: '-', item_name: item.item_name, price: item.price, buyer_name: '未售出', seller_name: userName, order_date: '-' }];
        });

        renderOrdersTable(result, 'contentContainer');
        const soldCount = result.filter(r => r.order_id !== '-').length;
        showMessage(`✅ ${userName}（${userId}）共 ${items.length} 件商品，${soldCount} 件已售`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

function renderOrdersTable(orders, containerId, silent = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!silent) { currentData = orders || []; currentMode = 'orders'; }
    if (!orders || orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">🧾</span><p>暂无订单数据</p></div>`;
        return;
    }
    let html = `<div class="table-wrapper"><table class="table table-hover">
        <thead><tr>
            <th>订单ID</th><th>商品名</th><th>买家</th>
            <th>卖家</th><th>价格</th><th>交易日期</th>
        </tr></thead><tbody>`;
    orders.forEach(o => {
        const noOrder = o.order_id === '-';
        html += `<tr class="${noOrder ? 'row-unsold' : ''}">
            <td>${noOrder ? '<span class="cell-dash">—</span>' : `<code>${o.order_id}</code>`}</td>
            <td><strong>${o.item_name}</strong></td>
            <td>${noOrder ? '<span class="badge badge-gray">未售出</span>' : o.buyer_name}</td>
            <td>${o.seller_name}</td>
            <td class="cell-price">${o.price === '-' ? '-' : '¥' + parseFloat(o.price).toFixed(2)}</td>
            <td>${noOrder ? '<span class="cell-dash">—</span>' : formatDate(o.order_date)}</td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ==================== 数据操作 ====================

async function insertNewItem() {
    // ── 权限检查：普通用户只能以自己的ID发布商品 ──
    if (isUser() && document.getElementById('newItemSeller')?.readOnly) {
        // 普通用户模式下，卖家ID 是只读且已填充为当前身份
        // 不需要额外检查
    }
    
    const g = id => document.getElementById(id)?.value.trim();
    const itemId   = g('newItemId');
    const itemName = g('newItemName');
    const category = g('newItemCategory');
    const priceRaw = g('newItemPrice');
    const price    = parseFloat(priceRaw);
    const sellerId = g('newItemSeller');

    // ── 非空约束校验 ──
    if (!itemId)   { showMessage('❌ 商品ID 不能为空', 'error'); return; }
    if (!itemName) { showMessage('❌ 商品名称 不能为空', 'error'); return; }
    if (!category) { showMessage('❌ 分类 不能为空', 'error'); return; }
    if (!priceRaw) { showMessage('❌ 价格 不能为空', 'error'); return; }
    if (isNaN(price) || price < 0) { showMessage('❌ 价格必须是大于等于 0 的数字', 'error'); return; }
    if (!sellerId) { showMessage('❌ 卖家ID 不能为空', 'error'); return; }
    
    // ── 身份权限检查：普通用户不能以他人名义发布 ──
    if (isUser() && sellerId !== currentUser) {
        showMessage('❌ 普通用户只能以自己的ID发布商品', 'error');
        return;
    }

    try {
        // ── 主键唯一性校验：检查商品ID是否已存在 ──
        const { data: existing } = await supabase
            .from('item').select('item_id').eq('item_id', itemId).maybeSingle();
        if (existing) {
            showMessage(`❌ 商品ID "${itemId}" 已存在，请更换一个不重复的ID`, 'error');
            return;
        }

        // ── 外键约束校验：检查卖家ID是否存在于用户表 ──
        const { data: seller } = await supabase
            .from('user').select('user_id').eq('user_id', sellerId).maybeSingle();
        if (!seller) {
            showMessage(`❌ 卖家ID "${sellerId}" 不存在，请输入已注册的用户ID`, 'error');
            return;
        }

        // ── 通过校验，执行插入 ──
        const { error } = await supabase.from('item')
            .insert([{ item_id: itemId, item_name: itemName, category, price, status: 0, seller_id: sellerId }]);
        if (error) throw error;

        showMessage(`✅ 商品"${itemName}"插入成功！`, 'success');
        ['newItemId','newItemName','newItemCategory','newItemPrice','newItemSeller']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        showAllItems(); loadItemStats();

    } catch (e) {
        // 兜底：解析数据库返回的错误信息
        const msg = e.message || '';
        if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
            showMessage(`❌ 商品ID "${itemId}" 已存在（主键重复）`, 'error');
        } else if (msg.includes('foreign') || msg.includes('23503')) {
            showMessage(`❌ 卖家ID "${sellerId}" 不存在（外键约束）`, 'error');
        } else if (msg.includes('not-null') || msg.includes('23502')) {
            showMessage('❌ 存在必填字段为空，请检查所有输入', 'error');
        } else {
            showMessage('❌ 插入失败: ' + msg, 'error');
        }
    }
}

async function updateItemPrice() {
    const itemId   = document.getElementById('updateItemId')?.value.trim();
    const priceRaw = document.getElementById('updateItemPrice')?.value.trim();
    const newPrice = parseFloat(priceRaw);

    // ── 非空约束校验 ──
    if (!itemId)   { showMessage('❌ 商品ID 不能为空', 'error'); return; }
    if (!priceRaw) { showMessage('❌ 新价格 不能为空', 'error'); return; }
    if (isNaN(newPrice) || newPrice < 0) {
        showMessage('❌ 价格必须是大于等于 0 的数字', 'error'); return;
    }

    try {
        // ── 先查询商品，同时获取状态和当前价格 ──
        const { data: item, error: fe } = await supabase
            .from('item').select('item_id, item_name, status, price, seller_id').eq('item_id', itemId).maybeSingle();
        if (fe) throw fe;

        // ── 商品不存在校验 ──
        if (!item) {
            showMessage(`❌ 商品ID "${itemId}" 不存在，请核对后重试`, 'error'); return;
        }
        
        // ── 身份权限检查：普通用户只能修改自己发布的商品价格 ──
        if (isUser() && item.seller_id !== currentUser) {
            showMessage(`❌ 普通用户只能修改自己发布的商品价格`, 'error');
            return;
        }

        // ── 业务约束：已售出商品不允许修改价格 ──
        if (item.status === 1) {
            showMessage(`❌ 商品"${item.item_name}"已售出，不允许修改价格`, 'error'); return;
        }

        // ── 价格未变化提醒 ──
        if (parseFloat(item.price) === newPrice) {
            showMessage(`⚠️ 新价格与当前价格相同（¥${newPrice}），无需修改`, 'info'); return;
        }

        // ── 通过校验，执行修改 ──
        const { error } = await supabase.from('item')
            .update({ price: newPrice }).eq('item_id', itemId);
        if (error) throw error;

        showMessage(`✅ "${item.item_name}" 价格已从 ¥${parseFloat(item.price).toFixed(2)} 更新为 ¥${newPrice.toFixed(2)}`, 'success');
        document.getElementById('updateItemId').value = '';
        document.getElementById('updateItemPrice').value = '';
        showAllItems(); loadItemStats();

    } catch (e) {
        showMessage('❌ 修改失败: ' + e.message, 'error');
    }
}

async function deleteUnsoldItem() {
    const itemId = document.getElementById('deleteItemId')?.value.trim();
    if (!itemId) { showMessage('❌ 商品ID 不能为空', 'error'); return; }

    try {
        // ── 先查商品 ──
        const { data: item, error: fe } = await supabase
            .from('item').select('item_id, item_name, status, seller_id').eq('item_id', itemId).maybeSingle();
        if (fe) throw fe;
        if (!item) { showMessage(`❌ 商品ID "${itemId}" 不存在`, 'error'); return; }

        // ── 只能删除未售出商品 ──
        if (item.status === 1) {
            showMessage(`❌ 商品"${item.item_name}"已售出，不允许删除`, 'error'); return;
        }

        // ── 权限检查：普通用户只能删自己发布的 ──
        if (isUser() && item.seller_id !== currentUser) {
            showMessage(`❌ 无权限：只能删除自己发布的商品`, 'error'); return;
        }

        // ── 二次确认 ──
        const who = isAdmin() ? '管理员' : currentUser;
        const confirmed = confirm(`[${who}] 确认删除商品"${item.item_name}"（${itemId}）？\n此操作不可撤销！`);
        if (!confirmed) return;

        const { error: de } = await supabase.from('item').delete().eq('item_id', itemId);
        if (de) throw de;

        document.getElementById('deleteItemId').value = '';
        showMessage(`✅ 商品"${item.item_name}"已删除`, 'success');
        showAllItems();
        loadItemStats();
    } catch (e) {
        showMessage('❌ 删除失败: ' + e.message, 'error');
    }
}

// ==================== 购买商品（乐观锁防并发重复销售）====================

async function buyItem(itemId, itemName, price) {
    const buyerId = currentUser;  // 使用当前身份作为买家 ID
    
    // 若是管理员身份，提示切换到普通用户再购买
    if (isAdmin()) {
        showMessage('❌ 管理员身份不能购买商品，请切换到普通用户身份', 'error');
        return;
    }

    try {
        // ── Step 1：读取商品当前状态和版本号 ──
        const { data: item, error: se } = await supabase
            .from('item')
            .select('status, version')
            .eq('item_id', itemId)
            .single();
        if (se) throw se;
        if (item?.status !== 0) {
            showMessage('❌ 该商品已售出，无法购买', 'error');
            showAllItems(); // 刷新状态
            return;
        }

        // ── Step 2：插入订单记录 ──
        const orderId = 'o' + Date.now().toString().slice(-9); // varchar(10) 限制
        const today = new Date().toISOString().slice(0, 10);
        const { error: ie } = await supabase.from('orders')
            .insert([{ order_id: orderId, item_id: itemId, buyer_id: buyerId.trim(), order_date: today }]);
        if (ie) throw ie;

        // ── Step 3：乐观锁更新商品状态（版本号必须匹配）──
        // 如果在 Step 1~3 之间另一用户已购买，version 已变化，此 update 会命中 0 行
        const currentVersion = item.version ?? 0;
        const { data: updated, error: ue } = await supabase
            .from('item')
            .update({ status: 1, version: currentVersion + 1 })
            .eq('item_id', itemId)
            .eq('version', currentVersion)  // 🔑 版本不匹配则不更新
            .select();
        if (ue) throw ue;

        if (!updated || updated.length === 0) {
            // 版本号不匹配 → 商品已被他人抢购 → 回滚订单
            await supabase.from('orders').delete().eq('order_id', orderId);
            showMessage('⚠️ 手慢了！商品已被他人购买，订单已自动取消', 'error');
            showAllItems(); loadItemStats();
            return;
        }

        // ── Step 4：成功 ──
        showMessage(`✅ 购买成功！"${itemName}" 已下单\n订单号：${orderId}`, 'success');
        showAllItems(); loadItemStats();

    } catch (e) { showMessage('购买失败: ' + e.message, 'error'); }
}

// ==================== Tab 切换 ====================

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
}

// ==================== 卡片折叠切换 ====================

function toggleCard(cardId) {
    const body = document.getElementById(cardId);
    const arrow = document.getElementById('arrow-' + cardId);
    if (!body) return;
    const isActive = body.classList.contains('active');
    body.classList.toggle('active', !isActive);
    if (arrow) arrow.textContent = isActive ? '▶' : '▼';
}

// ==================== 首页统计 ====================

async function updateHomeStats() {
    try {
        const [r1, r2, r3, r4] = await Promise.all([
            supabase.from('item').select('*', { count: 'exact', head: true }),
            supabase.from('item').select('*', { count: 'exact', head: true }).eq('status', 0),
            supabase.from('item').select('*', { count: 'exact', head: true }).eq('status', 1),
            supabase.from('item').select('price')
        ]);
        const avg = (r4.data?.length)
            ? (r4.data.reduce((s, i) => s + i.price, 0) / r4.data.length).toFixed(2) : '0.00';
        const el = document.getElementById('homeStats');
        if (el) el.innerHTML = `
            <div class="stat-card"><div class="label">商品总数</div><div class="value">${r1.count || 0}</div></div>
            <div class="stat-card"><div class="label">出售中</div><div class="value">${r2.count || 0}</div></div>
            <div class="stat-card"><div class="label">已售出</div><div class="value">${r3.count || 0}</div></div>
            <div class="stat-card"><div class="label">平均价格</div><div class="value">¥${avg}</div></div>`;
    } catch (e) { console.error(e); }
}

// ==================== 查询页：聚合查询 ====================

/**
 * 渲染通用结果表格到 #queryResult
 * @param {string[]} headers  列标题数组
 * @param {Array}    rows     数据行数组（对象数组）
 * @param {string[]} keys     对应每列的对象属性名
 */
function renderQueryTable(headers, rows, keys) {
    const el = document.getElementById('queryResult');
    if (!el) return;
    // 有结果时隐藏提示文字
    const tip = document.getElementById('queryTip');
    if (tip) tip.style.display = 'none';
    if (!rows || rows.length === 0) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>暂无结果</p></div>`;
        return;
    }
    let html = `<div class="table-wrapper"><table class="table table-hover">
        <thead class="table-light"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>`;
    rows.forEach(row => {
        html += `<tr>${keys.map(k => `<td>${row[k] ?? '-'}</td>`).join('')}</tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
}

/** COUNT：统计商品总数 */
async function queryCountItems() {
    const el = document.getElementById('queryResult');
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>查询中…</p></div>`;
    try {
        const { count, error } = await supabase.from('item').select('*', { count: 'exact', head: true });
        if (error) throw error;
        renderQueryTable(['统计项', '数量'], [{ label: '商品总数', value: count }], ['label', 'value']);
        showMessage(`商品总数：${count} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

/** GROUP BY category：各类商品数量 */
async function queryGroupByCategory() {
    const el = document.getElementById('queryResult');
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>查询中…</p></div>`;
    try {
        const { data, error } = await supabase.from('item').select('category');
        if (error) throw error;
        const cnt = {};
        (data || []).forEach(i => { cnt[i.category] = (cnt[i.category] || 0) + 1; });
        const rows = Object.entries(cnt)
            .sort((a, b) => b[1] - a[1])
            .map(([category, count]) => ({ category, count }));
        renderQueryTable(['商品类别', '数量'], rows, ['category', 'count']);
        showMessage(`共 ${rows.length} 个类别`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

/** AVG：计算平均价格 */
async function queryAvgPrice() {
    const el = document.getElementById('queryResult');
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>查询中…</p></div>`;
    try {
        const { data, error } = await supabase.from('item').select('price');
        if (error) throw error;
        const prices = data || [];
        const avg = prices.length
            ? (prices.reduce((s, i) => s + i.price, 0) / prices.length).toFixed(2)
            : '0.00';
        const min = prices.length ? Math.min(...prices.map(i => i.price)).toFixed(2) : '-';
        const max = prices.length ? Math.max(...prices.map(i => i.price)).toFixed(2) : '-';
        renderQueryTable(
            ['统计项', '价格（¥）'],
            [
                { label: '平均价格', value: avg },
                { label: '最低价格', value: min },
                { label: '最高价格', value: max }
            ],
            ['label', 'value']
        );
        showMessage(`平均价格：¥${avg}`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

/** GROUP BY seller_id + ORDER BY count DESC + LIMIT 1：发布最多的用户 */
async function queryTopSeller() {
    const el = document.getElementById('queryResult');
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>查询中…</p></div>`;
    try {
        const [{ data: items, error: ie }, { data: users, error: ue }] = await Promise.all([
            supabase.from('item').select('seller_id'),
            supabase.from('user').select('user_id, user_name')
        ]);
        if (ie) throw ie;
        if (ue) throw ue;
        const cnt = {};
        (items || []).forEach(i => { cnt[i.seller_id] = (cnt[i.seller_id] || 0) + 1; });
        const userMap = Object.fromEntries((users || []).map(u => [u.user_id, u.user_name]));
        const rows = Object.entries(cnt)
            .sort((a, b) => b[1] - a[1])
            .map(([seller_id, count], idx) => ({
                rank: idx + 1,
                seller_id,
                user_name: userMap[seller_id] || seller_id,
                count
            }));
        renderQueryTable(['排名', '用户ID', '用户名', '发布数量'], rows, ['rank', 'seller_id', 'user_name', 'count']);
        if (rows[0]) showMessage(`发布最多：${rows[0].user_name}，共 ${rows[0].count} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

// ==================== 查询页：视图查询 ====================

/** 视图：已售商品（status = 1） */
async function queryViewSoldItemsFull() {
    const el = document.getElementById('queryResult');
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>查询中…</p></div>`;
    try {
        const { data, error } = await supabase
            .from('item').select('item_id, item_name, category, price, seller_id')
            .eq('status', 1).order('item_id');
        if (error) throw error;
        renderQueryTable(
            ['商品ID', '商品名称', '分类', '价格（¥）', '卖家ID'],
            (data || []).map(i => ({ ...i, price: parseFloat(i.price).toFixed(2) })),
            ['item_id', 'item_name', 'category', 'price', 'seller_id']
        );
        showMessage(`已售商品视图：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

/** 视图：未售商品（status = 0） */
async function queryViewUnsoldItemsFull() {
    const el = document.getElementById('queryResult');
    if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div><p>查询中…</p></div>`;
    try {
        const { data, error } = await supabase
            .from('item').select('item_id, item_name, category, price, seller_id')
            .eq('status', 0).order('item_id');
        if (error) throw error;
        renderQueryTable(
            ['商品ID', '商品名称', '分类', '价格（¥）', '卖家ID'],
            (data || []).map(i => ({ ...i, price: parseFloat(i.price).toFixed(2) })),
            ['item_id', 'item_name', 'category', 'price', 'seller_id']
        );
        showMessage(`未售商品视图：${data.length} 件`, 'success');
    } catch (e) { showMessage('查询失败: ' + e.message, 'error'); }
}

// ==================== 数据一致性校验（系统崩溃后恢复检测）====================

/**
 * 启动时检查数据一致性
 * 目的：检测因系统崩溃/网络中断导致的订单与商品状态不一致问题
 */
async function validateDataConsistency() {
    console.log('🔍 [校验] 开始数据一致性检查...');
    let issues = [];

    try {
        const [
            { data: allItems, error: e1 },
            { data: allOrders, error: e2 }
        ] = await Promise.all([
            supabase.from('item').select('item_id, status'),
            supabase.from('orders').select('order_id, item_id')
        ]);
        if (e1 || e2) {
            console.warn('⚠️ [校验] 无法获取数据，跳过一致性检查');
            return;
        }

        // ── 检查1：已售出商品是否都有对应订单 ──
        const soldItems = allItems.filter(i => i.status === 1);
        const orderedItemIds = new Set((allOrders || []).map(o => o.item_id));
        soldItems.forEach(item => {
            if (!orderedItemIds.has(item.item_id)) {
                issues.push(`商品 ${item.item_id} 状态为"已售出"，但缺少订单记录（可能系统崩溃导致）`);
            }
        });

        // ── 检查2：订单中的商品是否都存在 ──
        const itemIdSet = new Set((allItems || []).map(i => i.item_id));
        (allOrders || []).forEach(order => {
            if (!itemIdSet.has(order.item_id)) {
                issues.push(`订单 ${order.order_id} 对应的商品 ${order.item_id} 不存在（孤立订单）`);
            }
        });

        if (issues.length === 0) {
            console.log('✅ [校验] 数据一致性检查通过，无异常');
        } else {
            console.warn('⚠️ [校验] 发现数据异常：', issues);
            // 在页面上用 message 提示管理员
            showMessage(`⚠️ 系统检测到 ${issues.length} 处数据异常，请查看控制台`, 'error');
        }
    } catch (err) {
        console.error('❌ [校验] 数据一致性检查失败:', err.message);
    }
}

console.log('✅ 校园二手交易平台已加载');
