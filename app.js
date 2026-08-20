const state = { source: "all", query: "", deals: [] };
const list = document.querySelector("#deal-list");
const empty = document.querySelector("#empty-state");
const updatedAt = document.querySelector("#updated-at");

const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
const DAY_MS = 24 * 60 * 60 * 1000;
const FOUR_WEEKS_MS = 28 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function discountOf(deal) {
  if (Number.isFinite(deal.discountRate)) return Math.max(0, Math.round(deal.discountRate));
  return deal.listPrice ? Math.max(0, Math.round((1 - deal.price / deal.listPrice) * 100)) : 0;
}

function timeAgo(iso) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes || 1}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function monthlyStats(deal) {
  const history = [...(deal.history ?? [])]
    .filter((item) => Number.isFinite(item.price) && Number.isFinite(Date.parse(item.observedAt)))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  if (history.length < 2) return null;
  const firstAt = Date.parse(history[0].observedAt);
  const lastAt = Date.parse(history.at(-1).observedAt);
  if (lastAt - firstAt < FOUR_WEEKS_MS) return null;
  const recent = history.filter((item) => Date.parse(item.observedAt) >= lastAt - MONTH_MS);
  const values = recent.map((item) => item.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { history: recent, min, max, isCurrentMin: deal.price <= min };
}

function historyChart(deal, stats) {
  if (!stats || stats.history.length < 2) return "";
  const values = stats.history.map((item) => item.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values.map((value, index) => `${((index / (values.length - 1)) * 100).toFixed(2)},${(8 + ((max - value) / spread) * 84).toFixed(2)}`).join(" ");
  return `<div class="price-chart" aria-label="${escapeHtml(deal.name)} 가격 추이">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><polyline points="${points}" /></svg>
    <span>최저 ${won.format(min)}</span><span>최고 ${won.format(max)}</span>
  </div>`;
}

function card(deal) {
  const discount = discountOf(deal);
  const monthly = monthlyStats(deal);
  const priceInsight = monthly
    ? monthly.isCurrentMin ? "1달 최저가격" : `최근 1달 최저 ${won.format(monthly.min)}`
    : null;
  const sourceName = deal.source === "toss" ? "토스" : "쿠팡";
  const image = deal.image
    ? `<img src="${escapeHtml(deal.image)}" alt="" loading="lazy">`
    : `<span>${sourceName.slice(0, 1)}</span>`;
  return `
    <a class="deal-card" href="${escapeHtml(deal.url)}" target="_blank" rel="noopener noreferrer sponsored">
      <div class="deal-image">
        <b class="source-badge ${deal.source}">${sourceName}</b>
        ${image}
      </div>
      <div class="deal-content">
        <h3>${escapeHtml(deal.name)}</h3>
        <div class="deal-price">
          <span class="discount${discount ? "" : " is-special"}">${discount ? `${discount}%` : "특가"}</span>
          <span class="price">${won.format(deal.price)}</span>
        </div>
        <div class="history">
          ${priceInsight ? `<strong>${escapeHtml(priceInsight)}</strong>` : ""}
          <span>${timeAgo(deal.observedAt)}</span>
        </div>
        ${historyChart(deal, monthly)}
      </div>
    </a>`;
}

function render() {
  const query = state.query.toLocaleLowerCase("ko-KR");
  const filtered = state.deals.filter((deal) => {
    const sourceMatches = state.source === "all" || deal.source === state.source;
    return sourceMatches && deal.name.toLocaleLowerCase("ko-KR").includes(query);
  });
  list.innerHTML = filtered.map(card).join("");
  empty.hidden = filtered.length > 0;
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".tab.is-active")?.classList.remove("is-active");
    button.classList.add("is-active");
    state.source = button.dataset.source;
    render();
  });
});

document.querySelector("#deal-search").addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  render();
});

try {
  const response = await fetch("deals.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  state.deals = payload.deals;
  updatedAt.textContent = `마지막 업데이트 ${dateTime.format(new Date(payload.updatedAt))}`;
  render();
} catch (error) {
  updatedAt.textContent = "상품 정보를 불러오지 못했습니다.";
  empty.hidden = false;
  console.error(error);
}
