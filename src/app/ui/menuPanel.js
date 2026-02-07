
import { total } from '../logic/menus.js';

export function renderMenuList(menus, { onSelect }) {
  const host = document.getElementById('menu-list');
  host.innerHTML = '';
  if (menus.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'menu-card';
    empty.style.textAlign = 'center';
    empty.style.gridTemplateColumns = '1fr';
    empty.innerHTML = '<h3 style="margin-bottom: 8px; white-space: nowrap;">条件を満たすメニューがありません</h3><div class="menu-meta">人数やカテゴリを調整してください</div>';
    host.appendChild(empty);
    return;
  }
  menus.forEach(menu => {
    const card = document.createElement('div');
    card.className = `menu-card menu-${menu.category}`;
    const left = document.createElement('div');
    const right = document.createElement('div');
    right.className = 'menu-actions';
    left.innerHTML = `<h3>${menu.name}</h3><div class="menu-meta">カテゴリ：${menu.categoryShort}｜所要：${menu.durationDefaultMin}分</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = '予定に追加';
    btn.addEventListener('click', () => onSelect(menu));
    right.appendChild(btn);
    card.appendChild(left);
    card.appendChild(right);
    host.appendChild(card);
  });
}
