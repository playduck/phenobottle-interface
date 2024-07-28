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

const tempData = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});
const gasData = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});
const odData = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});

const groups = new vis.DataSet([
  {id: 'divider', content: ''},
  {id: 'Illumination', className: 'Illumination', content: 'Illumination'},
  {id: 'Temperature', className: 'Temperature', content: 'Temperature'},
  {id: 'Mixing', className: 'Mixing', content: 'Mixing'},
  {id: 'Pump', className: 'Pump', content: 'Pump'}
]);

const items = new vis.DataSet({type: {start: 'ISODate', end: 'ISODate'}});
const zeroPad = (num, places) => String(num).padStart(places, '0')
for (let year = 0; year < 1; year++) {
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= 31; day++) {
      items.add([
        {
          id: year * 12 * 31 + month * 31 + (day - 1),
          content: 'Illumination',
          group: 'Illumination',
          start: new Date(2024 + year, month, day, 8, 0, 0, 0),
          end: new Date(2024 + year, month, day, 20, 0, 0, 0),
        },
      ]);
    }
  }
}

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
  height: '125px',
  autoResize: true,
  orientation: 'top',
  interpolation: false,
  shaded: false,
  legend: {enabled: true},
};

const tempOptions = {
  ...graphOptions,
  defaultGroup: '',
  dataAxis: {width: '73px', left: {range: {min: -10 -10, max: 50 + 10}}},
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
    add: true,         // add new items by double tapping
    updateTime: true,  // drag items horizontally
    updateGroup: false, // drag items from one group to another
    remove: true,       // delete an item by tapping the delete button top right
    overrideItems: false  // allow these options to override item.editable
  },
  stack: false,
  height: "200px",
  groupHeightMode: "fixed",
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
const timeline = new vis.Timeline(timelineContainer, items, groups, timelineOptions);

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

function addTempData() {
  const now = new Date(vis.moment());
  const value = 60 * y(now / 5000) - 10;

  const nowString = `${zeroPad(now.getDate(),2)}-${zeroPad(now.getHours(),2)}:${zeroPad(now.getMinutes(),2)}:${zeroPad(now.getSeconds(), 2)}:${zeroPad(now.getMilliseconds(), 3)}`;
  const valString = value.toFixed(1) + "°C";
  tempData.add({
    x: now,
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
    <td>${nowString}</td>
    <td>${valString}</td>
  </tr>
  `;
  tempTableBody.insertBefore(newRow, tempTableBody.firstChild);
}

function addGasData() {
  const now = new Date(vis.moment());
  const value = y(now / 500) * 800;

  const nowString = `${zeroPad(now.getDate(),2)}-${zeroPad(now.getHours(),2)}:${zeroPad(now.getMinutes(),2)}:${zeroPad(now.getSeconds(), 2)}:${zeroPad(now.getMilliseconds(), 3)}`;
  const valString = (value).toFixed(2) + "ppm";
  gasData.add({
    x: now,
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
    <td>${nowString}</td>
    <td>${valString}</td>
  </tr>
  `;
  gasTableBody.insertBefore(newRow, gasTableBody.firstChild);
}

function addOdData() {
  const now = new Date(vis.moment());
  const value = y(now / 1000);

  const nowString = `${zeroPad(now.getDate(),2)}-${zeroPad(now.getHours(),2)}:${zeroPad(now.getMinutes(),2)}:${zeroPad(now.getSeconds(), 2)}:${zeroPad(now.getMilliseconds(), 3)}`;
  const valString = (value * 100).toFixed(1) + "%";
  odData.add({
    x: now,
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
    <td>${nowString}</td>
    <td>${valString}</td>
  </tr>
  `;
  odTableBody.insertBefore(newRow, odTableBody.firstChild);
}

setInterval(addTempData, 543);
setInterval(addGasData, 1026);
setInterval(addOdData, 2665);

camera.onclick = () => {
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
