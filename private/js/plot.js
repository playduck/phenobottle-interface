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
const endSettingElement = document.getElementById("end-setting");
const periodSettingElement = document.getElementById("period-setting");
const parameterSettingElement = document.getElementById("parameter-setting");

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

// for (let year = 0; year < 1; year++) {
//   for (let month = 0; month < 12; month++) {
//     for (let day = 1; day <= 31; day++) {
//       items.add([
//         {
//           id: year * 12 * 31 + month * 31 + (day - 1),
//           content: 'Illumination',
//           group: 'Illumination',
//           start: new Date(2024 + year, month, day, 8, 0, 0, 0),
//           end: new Date(2024 + year, month, day, 20, 0, 0, 0),
//         },
//       ]);
//     }
//   }
// }

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
    add: true,           // add new items by double tapping
    updateTime: true,    // drag items horizontally
    updateGroup: false,  // drag items from one group to another
    remove: true,  // delete an item by tapping the delete button top right
    overrideItems: false  // allow these options to override item.editable
  },
  stack: false,
  height: '200px',
  groupHeightMode: 'fixed',
  orientation: 'bottom',
  rollingMode: {follow: false, offset: 0.85},

  onMoving: (item, callback) => {
    // let day_increment = 0;
    // if ((item.start.getDate() < item.end.getDate() ||
    //      item.end.getHours() == 0)) {
    //   day_increment = 1;
    // }

    // const start = [
    //   item.start.getHours(), item.start.getMinutes(), item.start.getSeconds()
    // ];
    // const end =
    //     [item.end.getHours(), item.end.getMinutes(), item.end.getSeconds()];

    // newItems = [];
    // console.log(items)
    // for (const idx in items._data) {
    //   if (items._data[idx] != item) {
    //     const startDate = new Date(items._data[idx].start.getTime());
    //     startDate.setHours(start[0], start[1], start[2]);

    //     const endDate = new Date(startDate.getTime());
    //     endDate.setDate(startDate.getDate() + day_increment);
    //     endDate.setHours(end[0], end[1], end[2]);

    //     items._data[idx].start = startDate;
    //     items._data[idx].end = endDate;

    //     newItems.push(items._data[idx]);
    //   }
    // }
    // items.update(newItems)
    callback(item);
  }

};

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

timeline.on('select', function (properties) {
  if(properties.items.length != 1)  {
    startSettingElement.disabled = true;
    endSettingElement.disabled = true;
    periodSettingElement.disabled = true ;
    parameterSettingElement.disabled = true ;
    return;
  }

  startSettingElement.disabled = false;
  endSettingElement.disabled = false;
  periodSettingElement.disabled = false;
  parameterSettingElement.disabled = false;

  const item = taskItems.get(properties.items[0])

  startSettingElement.value = `${zeroPad(item.start.getHours(), 2)}:${zeroPad(item.start.getMinutes(),2)}`;
  endSettingElement.value =   `${zeroPad(item.end.getHours(), 2)}:${zeroPad(item.end.getMinutes(),2)}`;

  if(item.period != null) {
    periodSettingElement.value = item.period.substr(0,5);
    console.log(item.period.substr(0,5))
  } else  {
    periodSettingElement.value = "00:00";
  }

});

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
        playSound(1000);
      } else {
        materModeButton.innerText = 'Enable Mater Mode';
        document.body.classList.remove('armed');
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
};

socket.on('connect', connectMessage);
socket.on('reconnect', connectMessage);

socket.on('failure', console.error);

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

const recurring_end_date = new Date(new Date().getFullYear() + 1, 0, 1);
console.log("rec end", recurring_end_date);

socket.on("tasks", (data) => {
  console.log("tasks", data);

  for(const task_idx in data) {
    const task = data[task_idx];
    console.log(task)

    let start = new Date(task.task_start);
    let end = new Date(task.task_end);

    let period = new Date(0);
    if(task.task_period != null)  {
      const [hours, minutes, seconds] = task.task_period.split(":");
      period = new Date(0);
      period.setHours(parseInt(hours) + 1);
      period.setMinutes(parseInt(minutes));
      period.setSeconds(parseInt(seconds));
    }

    let iteration = 0;
    let id = "";

    function addPeriod(date) {
      return new Date(date.getTime() + period.getTime());
    }

    do {
      id = `${task.task_id}:${iteration}`;

      taskItems.add([
        {
          id: id,
          content: task.task_name,
          group: task.task_type,
          start: start,
          end: end,
          period: task.task_period
        },
      ]);

      iteration += 1;
      start = addPeriod(start);
      end = addPeriod(end);

    } while(task.task_period && (end.getTime() < recurring_end_date.getTime()));

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
  console.log('Disconnected from the server', reason);
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
