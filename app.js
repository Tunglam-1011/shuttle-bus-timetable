// 只需修改此处的 HH:mm 时间，即可更新时刻表。
const schedules = {
  outbound: {
    title: "泰瑞府 → 道远楼东",
    detail: "从泰瑞府发车",
    timingNote: "以泰瑞府发车时间为准",
    weekday: ["07:05", "07:35", "08:05", "08:20", "08:35", "08:55", "09:05", "09:35", "10:05", "10:35", "11:05", "11:35", "12:05", "12:35", "12:55", "13:05", "13:15", "13:35", "13:50", "14:05", "14:35", "15:05", "15:35", "16:05", "16:35", "17:05", "17:35", "17:55", "18:05", "18:20", "18:35", "18:45", "19:05", "19:35", "20:05", "20:35", "21:05", "21:35", "22:05", "22:35"],
    weekend: ["07:05", "07:35", "08:35", "09:35", "10:35", "11:35", "12:35", "13:35", "14:35", "15:35", "16:35", "17:35", "18:35", "19:35", "20:35", "21:35", "22:35"]
  },
  return: {
    title: "道远楼东 → 泰瑞府",
    detail: "从道远楼东发车（张灵斌楼到站时间供参考）",
    secondaryLabel: "张灵斌楼到站",
    timingNote: "以张灵斌楼上车时间为准",
    weekday: [
      ["07:58", "07:55"], ["08:28", "08:25"], ["08:58", "08:55"], ["09:28", "09:25"], ["09:58", "09:55"], ["10:28", "10:25"], ["10:58", "10:55"], ["11:28", "11:25"], ["11:58", "11:55"], ["12:13", "12:10"], ["12:28", "12:25"], ["12:43", "12:40"], ["12:58", "12:55"], ["13:28", "13:25"], ["13:58", "13:55"], ["14:28", "14:25"], ["14:58", "14:55"], ["15:28", "15:25"], ["15:58", "15:55"], ["16:28", "16:25"], ["16:58", "16:55"], ["17:13", "17:10"], ["17:28", "17:25"], ["17:43", "17:40"], ["17:58", "17:55"], ["18:28", "18:25"], ["18:58", "18:55"], ["19:28", "19:25"], ["19:58", "19:55"], ["20:28", "20:25"], ["20:58", "20:55"], ["21:13", "21:10"], ["21:28", "21:25"], ["21:43", "21:40"], ["21:58", "21:55"], ["22:28", "22:25"], ["22:58", "22:55"]
    ],
    weekend: [
      ["07:57", "07:55"], ["08:57", "08:55"], ["09:57", "09:55"], ["10:57", "10:55"], ["11:57", "11:55"], ["12:57", "12:55"], ["13:57", "13:55"], ["14:57", "14:55"], ["15:57", "15:55"], ["16:57", "16:55"], ["17:57", "17:55"], ["18:57", "18:55"], ["19:57", "19:55"], ["20:57", "20:55"], ["21:57", "21:55"], ["22:57", "22:55"]
    ]
  }
};

let selectedDirection = "outbound";
let selectedReturnStop = "zhang";
let selectedQueryScheduleType;
const returnStops = {
  daoyuan: { label: "道远楼东", offset: 0 },
  zhang: { label: "张灵斌楼", offset: 3 },
  teaching: { label: "综合教学楼", offset: 5 }
};
const timeElement = document.querySelector("#current-time");
const serviceDayElement = document.querySelector("#service-day");
const routeTitleElement = document.querySelector("#route-title");
const routeDetailElement = document.querySelector("#route-detail");
const timingNoteElement = document.querySelector("#timing-note");
const departureListElement = document.querySelector("#departure-list");
const departureTemplate = document.querySelector("#departure-template");
const boardingStopPicker = document.querySelector("#boarding-stop-picker");
const hourSelect = document.querySelector("#hour-select");
const scheduleTypeSelect = document.querySelector("#schedule-type-select");
const queryResult = document.querySelector("#query-result");
const dateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" });
const clockFormatter = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function isWeekend(date) { return date.getDay() === 0 || date.getDay() === 6; }

const holidayDates = new Set([
  "2026-09-25", "2026-10-01", "2026-10-02", "2026-10-03",
  "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"
]);
const specialWorkdayDates = new Set(["2026-09-20"]);

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getScheduleType(date) {
  const key = dateKey(date);
  if (specialWorkdayDates.has(key)) return "weekday";
  if (holidayDates.has(key)) return "weekend";
  return isWeekend(date) ? "weekend" : "weekday";
}

selectedQueryScheduleType = getScheduleType(new Date());

function timeToday(time, now) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatRemaining(milliseconds) {
  const minutes = Math.ceil(milliseconds / 60000);
  return minutes <= 0 ? "即将到站" : `${minutes} 分钟后`;
}

function updateClock(now = new Date()) {
  timeElement.textContent = `${dateFormatter.format(now)} · ${clockFormatter.format(now)}`;
}

function render() {
  const now = new Date();
  const dayType = getScheduleType(now);
  const route = schedules[selectedDirection];
  const returnStop = returnStops[selectedReturnStop];
  const upcoming = route[dayType]
    .map((entry) => {
      const [zhangLingBinTime, daoYuanTime] = Array.isArray(entry) ? entry : [null, entry];
      const time = daoYuanTime;
      const pickupTime = selectedDirection === "return"
        ? (selectedReturnStop === "zhang" ? zhangLingBinTime : addMinutes(daoYuanTime, returnStop.offset))
        : time;
      return {
        time: selectedDirection === "return" ? pickupTime : time,
        secondaryTime: selectedDirection === "return" && selectedReturnStop !== "daoyuan" ? daoYuanTime : null,
        pickup: timeToday(pickupTime, now)
      };
    })
  // 返程车辆驶离道远楼东后，仍显示至经过所选上车站，避免错过上车班次。
    .filter(({ pickup }) => pickup >= now)
    .slice(0, 2);

  updateClock(now);
  serviceDayElement.textContent = dayType === "weekend" ? "周末 / 法定节假日时刻表" : "工作日时刻表";
  routeTitleElement.textContent = route.title;
  routeDetailElement.textContent = selectedDirection === "return"
    ? `从道远楼东发车 · ${returnStop.label}上车`
    : route.detail;
  timingNoteElement.textContent = selectedDirection === "return"
    ? `以${returnStop.label}上车时间为准`
    : route.timingNote;
  boardingStopPicker.hidden = selectedDirection !== "return";
  departureListElement.replaceChildren();

  if (!upcoming.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>今日班次已结束</strong><p>请在下一运营日查看新的班车安排。</p>";
    departureListElement.append(empty);
    return;
  }

  upcoming.forEach(({ time, secondaryTime, pickup }, index) => {
    const fragment = departureTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".departure-card");
    const remaining = pickup - now;
    const imminent = remaining <= 5 * 60 * 1000;
    fragment.querySelector(".departure-label").textContent = index === 0 ? "下一趟" : "第二趟";
    fragment.querySelector(".departure-time").textContent = time;
    fragment.querySelector(".departure-countdown").textContent = formatRemaining(remaining);
    const originElement = fragment.querySelector(".origin-departure");
    originElement.hidden = !secondaryTime;
    if (secondaryTime) originElement.textContent = `道远楼东发车：${secondaryTime}`;
    fragment.querySelector(".imminent-message").textContent = selectedDirection === "outbound"
      ? "即将发车"
      : "即将到站发车";
    fragment.querySelector(".imminent-message").hidden = !imminent;
    card.classList.toggle("imminent", imminent);
    departureListElement.append(fragment);
  });
}

document.querySelectorAll(".direction-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedDirection = button.dataset.direction;
    document.querySelectorAll(".direction-button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    render();
    renderQuery();
  });
});

function getScheduleRows() {
  const now = new Date();
  const route = schedules[selectedDirection];
  const returnStop = returnStops[selectedReturnStop];
  const dayType = selectedQueryScheduleType === "weekday" ? "weekday" : "weekend";
  return route[dayType].map((entry) => {
    const [zhangTime, daoYuanTime] = Array.isArray(entry) ? entry : [null, entry];
    const primary = selectedDirection === "return"
      ? (selectedReturnStop === "zhang" ? zhangTime : addMinutes(daoYuanTime, returnStop.offset))
      : daoYuanTime;
    return { primary, source: selectedDirection === "return" && selectedReturnStop !== "daoyuan" ? daoYuanTime : null };
  });
}

function renderQuery() {
  const [startHour, endHour] = hourSelect.value.split("-").map(Number);
  const now = new Date();
  const isTodaySchedule = selectedQueryScheduleType === getScheduleType(now);
  const rows = getScheduleRows().filter(({ primary }) => {
    const hour = Number(primary.slice(0, 2));
    return hour >= startHour && hour <= endHour;
  });
  queryResult.replaceChildren();
  if (!rows.length) {
    queryResult.innerHTML = `<div class="empty-state"><strong>该时段暂无班次</strong><p>请尝试选择其他小时。</p></div>`;
    return;
  }
  rows.forEach(({ primary, source }) => {
    const row = document.createElement("div");
    row.className = "query-row";
    let relative = "";
    if (isTodaySchedule) {
      const difference = timeToday(primary, now) - now;
      const minutes = Math.abs(Math.round(difference / 60000));
      const duration = minutes > 60
        ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
        : `${minutes} 分钟`;
      relative = difference >= 0 ? `${duration}后` : `已发车 ${duration}`;
    }
    row.innerHTML = `<div class="query-time"><time>${primary}</time>${source ? `<small>道远楼东发车 ${source}</small>` : ""}</div>${relative ? `<span>${relative}</span>` : ""}`;
    queryResult.append(row);
  });
}

const hourGroups = [[7, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 22]];
hourGroups.forEach(([startHour, endHour]) => {
  const option = document.createElement("option");
  option.value = `${startHour}-${endHour}`;
  option.textContent = `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:59`;
  hourSelect.append(option);
});
const currentHour = new Date().getHours();
hourSelect.value = hourGroups.find(([start, end]) => currentHour >= start && currentHour <= end)?.join("-") || "7-8";
hourSelect.addEventListener("change", renderQuery);
scheduleTypeSelect.value = selectedQueryScheduleType;
scheduleTypeSelect.addEventListener("change", () => {
  selectedQueryScheduleType = scheduleTypeSelect.value;
  renderQuery();
});

document.querySelectorAll(".page-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const live = button.dataset.page === "live";
    document.querySelector("#live-view").hidden = !live;
    document.querySelector("#search-view").hidden = live;
    document.querySelectorAll(".page-tab").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    if (!live) renderQuery();
  });
});

document.querySelectorAll(".stop-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedReturnStop = button.dataset.stop;
    document.querySelectorAll(".stop-button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    render();
    renderQuery();
  });
});

render();
setInterval(render, 1000);
