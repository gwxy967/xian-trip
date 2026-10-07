/* 长安行 · 西安旅行足迹地图
 * 依赖：高德 JS API 2.0（由 index.html 动态加载）、data.js（SPOTS）
 */

// 类型配色
var TYPE_COLOR = {
  sight:   "#c0392b",
  food:    "#e67e22",
  hotel:   "#2980b9",
  mall:    "#8e44ad",
  transit: "#7f8c8d"
};

var map = null;
var routeLine = null;
var activeSpot = null;

// 由 index.html 在地图 SDK 加载完成后调用
function boot() {
  map = new AMap.Map("map", {
    zoom: 12,
    center: [108.955, 34.27],
    mapStyle: "amap://styles/macaron", // 马卡龙浅色底图
    viewMode: "2D"
  });

  // 行程顺序 = SPOTS 数组顺序（build 脚本按首张照片时间生成）
  SPOTS.forEach(function (s, i) { s._order = i; addMarker(s); });
  drawRoute();
  buildTimeline();

  // 视野包含全部点位（留出面板空间）
  map.setFitView(null, false, [80, 40, 60, 300]);

  document.getElementById("toggle-route").onclick = toggleRoute;
  document.getElementById("toggle-panel").onclick = function () {
    document.getElementById("timeline").classList.toggle("open");
  };
  document.getElementById("drawer-close").onclick = closeDrawer;
}

/* ---------- 标注 ---------- */
function addMarker(spot) {
  var color = TYPE_COLOR[spot.type] || "#c0392b";
  var el = document.createElement("div");
  el.className = "spot-marker";
  el.innerHTML =
    '<div class="spot-pin" style="background:' + color + '">' + spot.count + "</div>" +
    '<div class="spot-label">' + spot.name + "</div>";

  var marker = new AMap.Marker({
    position: [spot.lng, spot.lat],
    content: el,
    anchor: "bottom-center",
    zIndex: 110
  });
  marker.on("click", function () { openSpot(spot, true); });
  marker.setMap(map);
  spot._marker = marker;
}

/* ---------- 行程路线（虚线） ---------- */
function drawRoute() {
  var path = SPOTS.map(function (s) { return [s.lng, s.lat]; });
  routeLine = new AMap.Polyline({
    path: path,
    strokeColor: "#8c2f1b",
    strokeWeight: 3,
    strokeStyle: "dashed",
    strokeOpacity: 0.75,
    lineJoin: "round",
    zIndex: 50,
    showDir: true
  });
  routeLine.setMap(map);
}
function toggleRoute() {
  var btn = document.getElementById("toggle-route");
  if (routeLine.getMap()) { routeLine.hide(); routeLine.setMap(null); btn.classList.remove("on"); }
  else { routeLine.setMap(map); routeLine.show(); btn.classList.add("on"); }
}

/* ---------- 左侧时间线 ---------- */
function buildTimeline() {
  var list = document.getElementById("tl-list");
  var html = "";
  var lastDate = "";
  SPOTS.forEach(function (s, i) {
    if (s.date !== lastDate) {
      html += '<div class="tl-day">' + s.date + "</div>";
      lastDate = s.date;
    }
    html +=
      '<div class="tl-item" data-i="' + i + '">' +
        '<span class="tl-dot" style="background:' + (TYPE_COLOR[s.type] || "#c0392b") + '"></span>' +
        '<span class="tl-name">' + s.name + "</span>" +
        '<span class="tl-time">' + s.time + "</span>" +
      "</div>";
  });
  list.innerHTML = html;
  document.getElementById("spot-count").textContent = SPOTS.length;

  list.addEventListener("click", function (e) {
    var item = e.target.closest(".tl-item");
    if (!item) return;
    openSpot(SPOTS[+item.dataset.i], true);
    document.getElementById("timeline").classList.remove("open");
  });
}

/* ---------- 打开景点详情 ---------- */
function openSpot(spot, flyTo) {
  activeSpot = spot;
  if (flyTo) map.setZoomAndCenter(15, [spot.lng, spot.lat]);

  document.querySelectorAll(".tl-item").forEach(function (el, i) {
    el.classList.toggle("active", SPOTS[i] === spot);
  });

  var body = document.getElementById("drawer-body");
  var grid = spot.photos.map(function (p, i) {
    return '<img loading="lazy" src="thumbs/' + spot.slug + "/" + p + '" data-i="' + i + '" alt="">';
  }).join("");

  body.innerHTML =
    '<img class="d-cover" src="photos/' + spot.slug + "/" + spot.photos[0] + '" alt="">' +
    '<div class="d-main">' +
      '<div class="d-name">' + spot.name + "</div>" +
      '<div class="d-meta">' + spot.date + " " + spot.time +
        (spot.anchor ? " · " + spot.anchor : "") + " · " + spot.count + " 张照片</div>" +
      '<div class="d-desc">' + spot.desc + "</div>" +
      '<div class="d-grid">' + grid + "</div>" +
    "</div>";
  body.scrollTop = 0;
  document.getElementById("drawer").classList.add("open");

  body.querySelector(".d-grid").onclick = function (e) {
    if (e.target.tagName === "IMG") openLightbox(spot, +e.target.dataset.i);
  };
  body.querySelector(".d-cover").onclick = function () { openLightbox(spot, 0); };
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
}

/* ---------- 照片查看器 ---------- */
var lbIndex = 0, lbSpot = null;
function openLightbox(spot, i) {
  lbSpot = spot; lbIndex = i;
  updateLightbox();
  document.getElementById("lightbox").classList.add("open");
}
function updateLightbox() {
  document.getElementById("lb-img").src = "photos/" + lbSpot.slug + "/" + lbSpot.photos[lbIndex];
  document.getElementById("lb-counter").textContent =
    lbSpot.name + " · " + (lbIndex + 1) + " / " + lbSpot.photos.length;
}
function lbStep(d) {
  lbIndex = (lbIndex + d + lbSpot.photos.length) % lbSpot.photos.length;
  updateLightbox();
}
document.getElementById("lb-close").onclick = function () {
  document.getElementById("lightbox").classList.remove("open");
};
document.getElementById("lb-prev").onclick = function () { lbStep(-1); };
document.getElementById("lb-next").onclick = function () { lbStep(1); };
document.getElementById("lightbox").onclick = function (e) {
  if (e.target === this) this.classList.remove("open");
};
document.addEventListener("keydown", function (e) {
  if (!document.getElementById("lightbox").classList.contains("open")) return;
  if (e.key === "Escape") document.getElementById("lightbox").classList.remove("open");
  if (e.key === "ArrowLeft") lbStep(-1);
  if (e.key === "ArrowRight") lbStep(1);
});
