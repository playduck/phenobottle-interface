const tempContainer = document.getElementById('temperature-plot');
const gasContainer = document.getElementById('gas-plot');
const odContainer = document.getElementById('od-plot');
const timelineContainer = document.getElementById('timeline');

const zoomDay = document.getElementById('zoom-day');
const zoomHour = document.getElementById('zoom-hour');
const zoomMinute = document.getElementById('zoom-minute');
const zoomFollow = document.getElementById('zoom-follow');

const tempTableBody = document.getElementById('temp-table-body');
const gasTableBody = document.getElementById('gas-table-body');
const odTableBody = document.getElementById('od-table-body');

const sign = document.getElementById('sign');
const camera = document.getElementById('camera');
const cameraContainer = document.getElementById('camera-container');

let materModeEnabled = false;
const materModeButton = document.getElementById('mater-mode-button');

const connectionElement = document.getElementById('connection');
const hostTimeElement = document.getElementById('time');

const tempData = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});
const gasData = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});
const odData = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});

const startSettingElement = document.getElementById("start-setting");
const durationSettingElement = document.getElementById("duration-setting");
const periodSettingElement = document.getElementById("period-setting");
const parameterSettingElement = document.getElementById("parameter-setting");

const saveTimelineBtn = document.getElementById("save-timeline");

const snackbar = document.getElementById("snackbar");
const snackbarTitle = document.getElementById("snack-title");
const snackbarBody = document.getElementById("snack-body");

const device_id = 1;  // FIXME


const groups = new vis.DataSet([
  {id: 'divider', content: ''},
  {id: 'illumination', className: 'Illumination', content: 'Illumination'},
  {id: 'temperature', className: 'Temperature', content: 'Temperature'},
  {id: 'mixing', className: 'Mixing', content: 'Mixing'},
  {id: 'pump', className: 'Pump', content: 'Pump'}
]);

const taskItems = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});
const zeroPad = (num, places) => String(num).padStart(places, '0')

const hourMargin = 4;
const commonOptions = {
  start: vis.moment().startOf('day').subtract(hourMargin, 'hours'),
  end: vis.moment().endOf('day').add(hourMargin, 'hours'),
  min: '2024-01-01',
  max: '2038-01-20',
  orientation: 'top',
  zoomMin: 5000,
  zoomMax: 50_000_000_000,
};

const graphOptions = {
  ...commonOptions,
  height: '140px',
  autoResize: true,
  orientation: 'top',
  interpolation: false,
  shaded: false,
  legend: {enabled: true},
};

const tempOptions = {
  ...graphOptions,
  defaultGroup: '',
  dataAxis: {width: '73px', left: {range: {min: -10 - 10, max: 50 + 10}}},
};

const gasOptions = {
  ...graphOptions,
  defaultGroup: '',
  orientation: 'none',
  dataAxis: {width: '73px', left: {range: {min: 0 - 100, max: 1000 + 100}}},
};

const odOptions = {
  ...graphOptions,
  defaultGroup: '',
  orientation: 'none',
  dataAxis: {width: '73px', left: {range: {min: 0 - 0.2, max: 1 + 0.1}}},
};

const timelineOptions = {
  ...commonOptions,
  editable: {
    add: false,           // add new items by double tapping
    updateTime: true,    // drag items horizontally
    updateGroup: false,  // drag items from one group to another
    remove: false,  // delete an item by tapping the delete button top right
    overrideItems: false  // allow these options to override item.editable
  },
  stack: false,
  height: '200px',
  groupHeightMode: 'fixed',
  orientation: 'bottom',
  rollingMode: {follow: false, offset: 0.85},
  snap: snap,
  onMoving: (item, callback) => {

    const start = `${item.start.getHours()}:${item.start.getMinutes()}:${item.start.getSeconds()}`
    const duration = dateDiffToString(item.start, item.end);
    tasks[canonicalTaskIndex].task_start = updateTime(tasks[canonicalTaskIndex].task_start, start);
    tasks[canonicalTaskIndex].task_duration = duration;

    startSettingElement.value = `${zeroPad(item.start.getHours(), 2)}:${zeroPad(item.start.getMinutes(),2)}`;
    const durations = duration.split(":");
    durationSettingElement.value = `${zeroPad(durations[0], 2)}:${zeroPad(durations[1], 2)}`;

    drawTasks(canonicalTaskIndex);

    callback(item);
  }
};

function snap(date, scale, step) {
  const minute = 60 * 1000; // 1 minute in milliseconds
  const hour = 60 * minute; // 1 hour in milliseconds

  let snapUnit;
  switch (scale) {
    case 'minute':
      snapUnit = minute;
      break;
    case 'hour':
      snapUnit = hour;
      break;
    case 'weekday':
      snapUnit = hour;
      break;
    case 'day':
      snapUnit = hour * 3;
      break;
    case 'month':
      snapUnit = hour * 8;
      break;
    case 'year':
      snapUnit = hour * 24;
      break;
    default:
      snapUnit = hour;
  }

  const snappingInterval = snapUnit;
  const remainder = date.getTime() % snappingInterval;
  if (remainder < snappingInterval / 2) {
    date = new Date(date.getTime() - remainder);
  } else {
    date = new Date(date.getTime() + (snappingInterval - remainder));
  }
  return date;
}

function dateDiffToString(date1, date2) {
  const diff = date2.getTime() - date1.getTime();
  const seconds = Math.abs(diff / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = seconds % 60;

  return `${zeroPad(hours, 2)}:${zeroPad(minutes, 2)}:${zeroPad(secondsLeft, 2)}`;
}

tempData.add({x: commonOptions.min, y: 18, group: 'Optimal'});
tempData.add({x: commonOptions.max, y: 18, group: 'Optimal'});

const tempplot = new vis.Graph2d(tempContainer, tempData, tempOptions);
const gasplot = new vis.Graph2d(gasContainer, gasData, gasOptions);
const odplot = new vis.Graph2d(odContainer, odData, odOptions);
const timeline =
    new vis.Timeline(timelineContainer, taskItems, groups, timelineOptions);

tempplot.on('rangechange', () => {
  const {start, end} = {...tempplot.getWindow()};
  odplot.setWindow(start, end, {animation: false});
  gasplot.setWindow(start, end, {animation: false});
  timeline.setWindow(start, end, {animation: false});
});

gasplot.on('rangechange', () => {
  const {start, end} = {...gasplot.getWindow()};
  tempplot.setWindow(start, end, {animation: false});
  odplot.setWindow(start, end, {animation: false});
  timeline.setWindow(start, end, {animation: false});
});

odplot.on('rangechange', () => {
  const {start, end} = {...odplot.getWindow()};
  tempplot.setWindow(start, end, {animation: false});
  gasplot.setWindow(start, end, {animation: false});
  timeline.setWindow(start, end, {animation: false});
});

timeline.on('rangechange', () => {
  const {start, end} = {...timeline.getWindow()};
  gasplot.setWindow(start, end, {animation: false});
  odplot.setWindow(start, end, {animation: false});
  tempplot.setWindow(start, end, {animation: false});
});

let canonicalTaskIndex = null;
timeline.on('select', function (properties) {
  if(properties.items.length != 1)  {
    startSettingElement.disabled = true;
    durationSettingElement.disabled = true;
    periodSettingElement.disabled = true ;
    parameterSettingElement.disabled = true ;
    canonicalTask = null;
    return;
  }

  startSettingElement.disabled = false;
  durationSettingElement.disabled = false;
  periodSettingElement.disabled = false;
  parameterSettingElement.disabled = false;

  const item = taskItems.get(properties.items[0]);
  canonicalTaskIndex = item.index;

  startSettingElement.value = `${zeroPad(item.start.getHours(), 2)}:${zeroPad(item.start.getMinutes(),2)}`;
  const duration = item.duration.split(":");
  durationSettingElement.value = `${zeroPad(duration[0], 2)}:${zeroPad(duration[1], 2)}`;

  if(item.period != null) {
    periodSettingElement.value = item.period.substr(0,5);
  } else  {
    periodSettingElement.value = "00:00";
  }
});

startSettingElement.addEventListener("change", () => {
  if(canonicalTaskIndex != null)  {
    tasks[canonicalTaskIndex].task_start = updateTime(tasks[canonicalTaskIndex].task_start, startSettingElement.value);
    drawTasks(canonicalTaskIndex);
  }
});
durationSettingElement.addEventListener("change", () => {
  if(canonicalTaskIndex != null)  {
    tasks[canonicalTaskIndex].task_duration = padHMS(durationSettingElement.value);
    drawTasks(canonicalTaskIndex);
  }
});
periodSettingElement.addEventListener("change", () => {
  console.log(tasks[canonicalTaskIndex].task_period)
  if(canonicalTaskIndex != null)  {
    tasks[canonicalTaskIndex].task_period = padHMS(periodSettingElement.value);
    drawTasks(canonicalTaskIndex);
  }
});

saveTimelineBtn.addEventListener("click", () => {
  console.log(tasks);
});

function updateTime(originalTime, newHMS) {
  const [datePart, timePart] = originalTime.split('T');
  const newHMSParts = newHMS.split(':');
  const newHours = parseInt(newHMSParts[0]) % 24 || 0;
  const newMinutes = parseInt(newHMSParts[1]) || 0;
  const newSeconds = parseInt(newHMSParts[2]) || 0;
  const updatedTimePart = `${zeroPad(newHours,2)}:${zeroPad(newMinutes,2)}:${zeroPad(newSeconds,2)}.000Z`;
  return `${datePart}T${updatedTimePart}`;
}

function padHMS(newHMS) {
  const newHMSParts = newHMS.split(':');
  const newHours = parseInt(newHMSParts[0] ) || 0;
  const newMinutes = parseInt(newHMSParts[1]) || 0;
  const newSeconds = parseInt(newHMSParts[2]) || 0;
  return`${zeroPad(newHours,2)}:${zeroPad(newMinutes,2)}:${zeroPad(newSeconds,2)}`;
}

function drawTasks(index)  {
  const canonicalTask = tasks[index];

  let duration = new Date(0);
  const [hours, minutes, seconds] = canonicalTask.task_duration.split(":");
  duration.setHours(parseInt(hours) + 1);
  duration.setMinutes(parseInt(minutes));
  duration.setSeconds(parseInt(seconds));

  let start = new Date(canonicalTask.task_start);
  let end = addDates(start, duration);

  let period = new Date(0);
  if(canonicalTask.task_period != null)  {
    const [hours, minutes, seconds] = canonicalTask.task_period.split(":");
    period = new Date(0);
    period.setHours(parseInt(hours) + 1);
    period.setMinutes(parseInt(minutes));
    period.setSeconds(parseInt(seconds));
  }

  let iteration = 0;
  let id = "";

  function addDates(date1, date2) {
    return new Date(date1.getTime() + date2.getTime());
  }

  do {
    id = `${canonicalTask.task_id}:${iteration}`;

    taskItems.update([
      {
        id: id,
        canonicalId: canonicalTask.task_id,
        index: index,
        content: canonicalTask.task_name,
        group: canonicalTask.task_type,
        start: start,
        end: end,
        duration: canonicalTask.task_duration,
        period: canonicalTask.task_period,
      },
    ]);

    iteration += 1;
    start = addDates(start, period);
    end = addDates(start, duration);

  } while(canonicalTask.task_period && (end.getTime() < recurring_end_date.getTime()));

  const firstitem = taskItems.get(`${canonicalTask.task_id}:0`);
  firstitem.generated = iteration-1;

}

zoomDay.onclick = () => {
  const start = vis.moment().startOf('day').subtract(hourMargin, 'hours');
  const end = vis.moment().endOf('day').add(hourMargin, 'hours');

  tempplot.setWindow(start, end, {animation: true});
  gasplot.setWindow(start, end, {animation: true});
  odplot.setWindow(start, end, {animation: true});
  timeline.setWindow(start, end, {animation: true});
};

zoomHour.onclick = () => {
  const start = vis.moment().startOf('hour').subtract(hourMargin, 'minutes');
  const end = vis.moment().endOf('hour').add(hourMargin, 'minutes');

  tempplot.setWindow(start, end, {animation: true});
  gasplot.setWindow(start, end, {animation: false});
  odplot.setWindow(start, end, {animation: true});
  timeline.setWindow(start, end, {animation: true});
};

zoomMinute.onclick = () => {
  const start = vis.moment().startOf('minute').subtract(hourMargin, 'seconds');
  const end = vis.moment().endOf('minute').add(hourMargin, 'seconds');

  tempplot.setWindow(start, end, {animation: true});
  gasplot.setWindow(start, end, {animation: false});
  odplot.setWindow(start, end, {animation: true});
  timeline.setWindow(start, end, {animation: true});
};

zoomFollow.onclick = () => {
  const window = tempplot.getWindow();
  timeline.toggleRollingMode();
  timeline.setWindow(window.start, window.end, {animation: false});
};

function y(x) {
  return 0.5 *
      (Math.tanh((Math.sin(x / 2) + Math.cos(x / 4)) * 2 * Math.random()) + 1);
}

function addTempData(timestamp, value) {
  const date = new Date(timestamp);

  const timeString = `${zeroPad(date.getDate(), 2)}-${
      zeroPad(date.getHours(), 2)}:${zeroPad(date.getMinutes(), 2)}:${
      zeroPad(date.getSeconds(), 2)}:${zeroPad(date.getMilliseconds(), 3)}`;
  const valString = value.toFixed(1) + '°C';
  tempData.add({
    x: date,
    y: value,
    group: 'Temperature',
    label: {
      content: valString,
      className: 'vis-data-label',
      xOffset: 12,
      yOffset: 4
    }
  });

  const newRow = document.createElement('tr');
  newRow.innerHTML = `
  <tr>
    <td>${timeString}</td>
    <td>${valString}</td>
  </tr>
  `;
  tempTableBody.insertBefore(newRow, tempTableBody.firstChild);

  if (materModeEnabled) {
    const highLimit = parseFloat(document.getElementById('temp-high-alert').value);
    const lowLimit = parseFloat(document.getElementById('temp-low-alert').value);

    if (value >= highLimit || value <= lowLimit) {
      playSound(5000);
      showSnackbar("fail", `${value.toFixed(2)}°C!`, "Mater Mode triggered by temperature");
    }
  }
}

function addGasData(timestamp, value) {
  const time = new Date(timestamp);

  const timeString = `${zeroPad(time.getDate(), 2)}-${
      zeroPad(time.getHours(), 2)}:${zeroPad(time.getMinutes(), 2)}:${
      zeroPad(time.getSeconds(), 2)}:${zeroPad(time.getMilliseconds(), 3)}`;
  const valString = (value).toFixed(2) + 'ppm';
  gasData.add({
    x: time,
    y: value,
    group: 'CO2',
    label: {
      content: valString,
      className: 'vis-data-label',
      xOffset: 12,
      yOffset: 4
    }
  });

  const newRow = document.createElement('tr');
  newRow.innerHTML = `
  <tr>
    <td>${timeString}</td>
    <td>${valString}</td>
  </tr>
  `;
  gasTableBody.insertBefore(newRow, gasTableBody.firstChild);

  if (materModeEnabled) {
    const highLimit = parseFloat(document.getElementById('co2-high-alert').value);
    const lowLimit = parseFloat(document.getElementById('co2-low-alert').value);

    if (value >= highLimit || value <= lowLimit) {
      playSound(5000);
      showSnackbar("fail", `${value.toFixed(2)}ppm!`, "Mater Mode triggered by CO2");
    }
  }
}

function addOdData(timestamp, value) {
  const time = new Date(timestamp);

  const timeString = `${zeroPad(time.getDate(), 2)}-${
      zeroPad(time.getHours(), 2)}:${zeroPad(time.getMinutes(), 2)}:${
      zeroPad(time.getSeconds(), 2)}:${zeroPad(time.getMilliseconds(), 3)}`;
  const valString = (value * 100).toFixed(1) + '%';
  odData.add({
    x: time,
    y: value,
    group: 'OD750',
    label: {
      content: valString,
      className: 'vis-data-label',
      xOffset: 12,
      yOffset: 4
    }
  });

  const newRow = document.createElement('tr');
  newRow.innerHTML = `
  <tr>
    <td>${timeString}</td>
    <td>${valString}</td>
  </tr>
  `;
  odTableBody.insertBefore(newRow, odTableBody.firstChild);
}

// setInterval(addTempData, 543);
// setInterval(addGasData, 1026);
// setInterval(addOdData, 2665);

cameraContainer.onclick = () => {
  document.body.classList.toggle('fullscreen');
};


sign.onclick = () => {
  const dino = document.createElement('iframe');
  dino.src = '//priler.github.io/dino3d/low.html';
  dino.id = 'dino';
  document.body.appendChild(dino);
  setTimeout(() => {
    const innerDoc = dino.contentDocument || dino.contentWindow.document;
    innerDoc.getElementById('game-start').click();
  }, 1000);
};



let source = undefined;
let audioContext = undefined;
let started = false;

const xhr = new XMLHttpRequest();
xhr.open('GET', 'assets/mater.mp3', true);
xhr.responseType = 'arraybuffer';
xhr.onload = function() {
  if (xhr.status === 200) {
    audioContext = new AudioContext();
    audioContext.decodeAudioData(xhr.response, function(buffer) {
      source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1; // adjust the volume
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
      audioContext.suspend();
      isPlaying = false;
    });
  }
};
xhr.send();

let totalPlaybackTime = 0;
let isPlaying = false;
let playbackStart = 0;
let timeoutId = null;

function playSound(duration_ms) {
  if(started == false) {
    started = true;
    source.start();
  }
  if (!isPlaying) {
    audioContext.resume();
    isPlaying = true;
    playbackStart = audioContext.currentTime;
    document.body.classList.add('triggered');
  }
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(() => {
    if (isPlaying) {
      isPlaying = false;
      audioContext.suspend();
      document.body.classList.remove('triggered');
    }
  }, duration_ms);
}

materModeButton.onclick =
    () => {
      materModeEnabled = !materModeEnabled;

      if (materModeEnabled === true) {
        materModeButton.innerText = 'Disable Mater Mode';
        document.body.classList.add('armed');
        showSnackbar("", "Mater Mode Armed", "");

        playSound(1000);
      } else {
        if(timeoutId !== null)  {
          clearTimeout(timeoutId);
        }
        materModeButton.innerText = 'Enable Mater Mode';
        document.body.classList.remove('armed');
        document.body.classList.remove('triggered');
        isPlaying = false;
        audioContext.suspend();

        showSnackbar("", "Mater Mode Disabled", "");
      }
    }

const socket = io();

const connectMessage = () => {
  setTimeout(() => {
    socket.emit('deviceListRequest');
    socket.emit("usernameRequest");
    socket.emit('imageRequest', device_id);
    socket.emit('taskRequest', device_id);
    socket.emit('measurementRequest', device_id, 'temperature', 100);
    socket.emit('measurementRequest', device_id, 'CO2', 100);
    socket.emit('measurementRequest', device_id, 'OD', 100);
  }, 200);
  console.log(socket)

  showSnackbar("success", "Connection Established", `Connected to ${socket._opts.hostname}:${socket._opts.port}${socket._opts.path}`);
};

socket.on('connect', connectMessage);
socket.on('reconnect', connectMessage);

socket.on('failure', (err) => {
  showSnackbar("fail", "Received Failure", err);
});

const deviceListElement = document.getElementById('device-id');
socket.on('deviceList', (devices) => {
  // device_id = devices[0].device_id;

  for (const device in devices) {
    const optionItem = document.createElement('option');
    optionItem.value = devices[device].device_id;
    optionItem.innerText =
        `${devices[device].device_name} (${devices[device].device_id})`;
    deviceListElement.appendChild(optionItem);
  }
});

const usernameElement = document.getElementById("username");
socket.on("username", (username) => {
  usernameElement.innerText = username;
})

socket.on('imageUpdate', (data) => {
  const buffer = new Uint8Array(data.buffer);
  const blob = new Blob([buffer], {type: 'image/avif'});
  const url = URL.createObjectURL(blob);

  cameraContainer.style.setProperty('--url', `url(${url})`);

  const timestampDiv = document.getElementById('camera-timestamp');
  timestampDiv.innerText = new Date(data.timestamp).toLocaleString();
});

const currentDate = new Date();
const recurring_end_date = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

let tasks = [];
socket.on("tasks", (data) => {
  console.log("tasks", data);

  tasks = data;

  for(const task_idx in tasks) {
    drawTasks(task_idx);
  }
});
socket.on('measurementTemperature', (rows) => {
  for (const row in rows) {
    addTempData(rows[row].timestamp, rows[row].value);
  }
});
socket.on('measurementCO2', (rows) => {
  for (const row in rows) {
    addGasData(rows[row].timestamp, rows[row].value);
  }
});
socket.on('measurementOD', (rows) => {
  for (const row in rows) {
    addOdData(rows[row].timestamp, rows[row].value);
  }
});

// Handle heartbeat request from server
let rtt_filtered = -1;
const rtt_alpha = 0.5;
socket.on('heartbeatRequest', (serverTimestamp) => {
  const startTime = Date.now();
  socket.emit('heartbeat');

  hostTimeElement.innerText = (new Date(serverTimestamp)).toLocaleTimeString();

  socket.once('heartbeatResponse', () => {
    const endTime = Date.now();
    const rtt = endTime - startTime;

    if (rtt_filtered == -1) {
      rtt_filtered = rtt;
    } else {
      rtt_filtered = (rtt_alpha * rtt_filtered) + ((1 - rtt_alpha) * rtt);
    }

    connectionElement.innerText = `${rtt_filtered.toFixed(2)}ms`;

    if (document.body.classList.contains('offline')) {
      document.body.classList.remove('offline');
      document.body.classList.add('online');
    }

    socket.emit('heartbeatResponse', rtt);
  });
});

socket.on('disconnect', (reason) => {
  console.log('Disconnect', reason);
  showSnackbar("success", "Disconnected from server", reason);

  connectionElement.innerText = '';
  hostTimeElement.innerText = '-';
  document.body.classList.remove('online');
  document.body.classList.add('offline');
  rtt_filtered = -1;
});

document.getElementById("logout").addEventListener("click", (e) => {
  fetch('/api/v1/logout', {
    method: 'POST'
  })
  .then((res) => res.json())
  .then((data) => {
    location.href = data.message;
  })
  .catch(console.err);
});

function hideSnackbar(callback) {
  const snackbarTransitionDurationMS = 200;

  // if(snackbar.classList.contains("show")) {
  //   snackbar.classList.remove("show");
  //   setTimeout(() => {callback;}, snackbarTransitionDurationMS);
  // } else  {
    callback();
  // }
}

let snackabrActivations = 0;
function showSnackbar(type, title, body)  {
  snackabrActivations += 1;
  hideSnackbar(() => {
    snackbarTitle.innerText = title;
    snackbarBody.innerText = body;
    snackbar.className = "show";
    if(type)  snackbar.classList.add(type);
    setTimeout(() => {
      snackabrActivations -= 1;
      if(snackabrActivations <= 0)  {
        snackabrActivations = 0;
        if(type) snackbar.classList.remove(type);
        snackbar.classList.remove("show");
      }
    }, 4000);
  });
}

snackbar.addEventListener("click", () => {
  snackbar.classList.remove("show");
});
