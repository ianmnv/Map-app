'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const workoutContainer = document.querySelector('.workout_container');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Challenges
const btnEdit = document.querySelector('.btn_edit');

class App {
  #map;
  #mapZoom = 14;
  #mapEvent;
  #workouts = [];
  dontChange = false;
  sorted = false;

  constructor() {
    // Get position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Challenges
    containerWorkouts.addEventListener(
      'mouseover',
      this._displayBtns.bind(this)
    );
    containerWorkouts.addEventListener('mouseout', this._hideBtns);

    this.createBtns();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoom);

    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // Render workout markers from local storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.toggle('hidden');
    form.classList.toggle('form--transition');
    inputDistance.focus();
  }

  _hideForm() {
    // Emtpy fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    // Hide form
    // form.style.display = 'none';
    // form.classList.add('hidden');
    // setTimeout(() => (form.style.display = 'grid'), 1000);

    form.classList.toggle('hidden');
    form.classList.toggle('form--transition');
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      
      <div class='container_btns hidden'>
        <button class='btn_edit' data-type='edit'>📝</button>
        <button class='btn_delete' data-type='del'>❌</button>
      </div>

      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>

      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${
            workout.pace ? workout.pace.toFixed(1) : 0
          }</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${
            workout.speed ? workout.speed.toFixed(1) : 0
          }</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li> 
      `;

    workoutContainer.insertAdjacentHTML('afterbegin', html);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      duration: 1,
    });

    workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // this.#workouts = data;

    this.#workouts = data.map(work => {
      let obj;
      if (work.type === 'running') obj = new Running();
      if (work.type === 'cycling') obj = new Cycling();

      Object.assign(obj, work);
      return obj;
    });

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  // Challenges
  _displayBtns(e) {
    e.preventDefault();
    const workout = e.target.closest('.workout');

    if (!workout) return;

    const containerBtns = workout.querySelector('.container_btns');
    containerBtns.classList.toggle('hidden');

    containerBtns.addEventListener('click', this._editWorkout.bind(this));
    containerBtns.addEventListener('mouseover', this._showMessage);
    containerBtns.addEventListener('mouseout', this._hideMessage);
  }

  _hideBtns(e) {
    e.preventDefault();
    const workout = e.target.closest('.workout');
    if (!workout) return;
    workout.querySelector('.container_btns').classList.toggle('hidden');
  }

  _showMessage(e) {
    if (e.target.dataset.type) {
      const type = e.target.dataset.type;

      const divEl = document.createElement('div');
      const signal = document.createElement('span');
      divEl.className = 'divMessage';

      if (type === 'edit') {
        signal.textContent = 'edit';
        divEl.classList.add('divEdit');
      }
      if (type === 'del') {
        signal.textContent = 'delete';
        divEl.classList.add('divDel');
      }
      divEl.prepend(signal);
      e.target.append(divEl);
    }
  }

  _hideMessage(e) {
    const removeAll = e.target
      .closest('.container_btns')
      .querySelectorAll('.divMessage');
    if (e.target.dataset.type === 'edit') removeAll.forEach(el => el.remove());
    if (e.target.dataset.type === 'del') removeAll.forEach(el => el.remove());
  }

  _editWorkout(e) {
    const btn = e.target;

    const index = this.#workouts.findIndex(
      work => work.id === btn.closest('.workout').dataset.id
    );
    // Guard clause
    if (!this.#workouts[index]) return;

    // To edit specific workout
    if (btn.dataset.type === 'edit') {
      if (!this.dontChange) {
        this.dontChange = true;
        const work = this.#workouts[index];

        // Every workout: distance & duration
        const distance = Number(
          prompt(`Set new distance, right now is ${work.distance} km`)
        );
        const duration = Number(
          prompt(`Set new duration, right now is ${work.duration} min`)
        );

        work.distance = distance;
        work.duration = duration;

        // In running: cadence
        if (work.type === 'running') {
          const cadence = Number(
            prompt(`Set new cadence, right now is ${work.cadence} spm`)
          );
          work.cadence = cadence;
          work.calcPace();
        }
        // In cycling: elevationGain
        if (work.type === 'cycling') {
          const elevation = Number(
            prompt(
              `Set new elevation gain, right now is ${work.elevationGain} m`
            )
          );
          work.elevationGain = elevation;
          work.calcSpeed();
        }

        this._setLocalStorage();
        location.reload();
      }
    }

    // To delete specific workout
    if (btn.dataset.type === 'del') {
      this.#workouts.splice(index, 1);
      this._setLocalStorage();
      location.reload();
    }
  }

  createBtns() {
    // Delete all workouts button
    const btn = document.createElement('button');
    btn.textContent = 'Delete all workouts';
    btn.classList.add('delAll');
    const sidebar = document.querySelector('.sidebar');
    sidebar.append(btn);
    const delAll = document.querySelector('.delAll');
    delAll.addEventListener('click', this.reset);

    // Parent element of container buttons
    const imgEl = document.querySelector('.logo');
    // Parent element of buttons
    const btnContainer = document.createElement('div');
    btnContainer.classList.add('div_container');

    // Sort workouts by option
    const span = document.createElement('span');
    span.classList.add('sort_title');
    span.textContent = 'Sort by:';

    const sortBtn = document.createElement('select');
    sortBtn.classList.add('form__input', 'sort_select');
    // Sort by duration, distance; running: cadence, pace; cycling: elevation or speed
    const options = [
      { text: 'duration ⏱', value: 'duration' },
      { text: 'distance: 🏃‍♂️ or 🚴‍♀️', value: 'distance' },
      { text: '🏃‍♂️ cadence 🦶🏼', value: 'cadence' },
      { text: '🏃‍♂️ pace ⚡️', value: 'pace' },
      { text: '🚴‍♀️ elevation ⛰', value: 'elevation' },
      { text: '🚴‍♀️ speed ⚡️', value: 'speed' },
    ];

    options.forEach(opt => {
      const option = document.createElement('option');
      option.textContent = opt.text;
      option.value = opt.value;

      sortBtn.append(option);
    });

    // Show all workouts on the map
    const showAll = document.createElement('button');
    showAll.classList.add('show_btn');
    showAll.textContent = 'Show all Workouts';

    btnContainer.append(span, sortBtn, showAll);
    imgEl.after(btnContainer);

    // Event handlers
    btnContainer.addEventListener('click', this._sortOrShowAll.bind(this));
  }

  _sortOrShowAll(e) {
    // Show all workouts in the map
    if (e.target.classList.contains('show_btn')) {
      const lats = [];
      const lngs = [];
      this.#workouts.forEach(work => {
        lats.push(work.coords[0]);
        lngs.push(work.coords[1]);
      });

      const maxLat = Math.max(...lats);
      const minLat = Math.min(...lats);

      const maxLng = Math.max(...lngs);
      const minLng = Math.min(...lngs);

      this.#map.fitBounds(
        [
          [maxLat, maxLng],
          [minLat, minLng],
        ],
        { padding: [100, 100] }
      );
    }

    // Sorting workouts
    if (e.target.classList.contains('sort_select')) {
      const selectedOpt = e.target.value;
      switch (selectedOpt) {
        case 'duration':
          this._sortWorkouts(undefined, undefined, 'duration');
          this.sorted = !this.sorted;
          break;
        case 'distance':
          this._sortWorkouts(undefined, undefined, 'distance');
          this.sorted = !this.sorted;
          break;
        // Running: cadence & pace
        case 'cadence':
          this._sortWorkouts(undefined, undefined, 'cadence');
          this.sorted = !this.sorted;
          break;
        case 'pace':
          this._sortWorkouts(undefined, undefined, 'pace');
          this.sorted = !this.sorted;
          break;
        // Cycling: speed & elevation
        case 'speed':
          this._sortWorkouts(undefined, undefined, 'speed');
          this.sorted = !this.sorted;
          break;
        case 'elevation':
          this._sortWorkouts(undefined, undefined, 'elevationGain');
          this.sorted = !this.sorted;
          break;
      }
    }
  }

  _sortWorkouts(work = this.#workouts, sorted = this.sorted, workType) {
    const mapTypes = new Map([]);
    work.forEach(work => {
      if (!work[workType]) return;
      mapTypes.set(work.id, work[workType]);
    });

    const arrMapTypes = Array.from(mapTypes.entries());
    const copyTypes = Array.from(mapTypes.entries());

    workoutContainer.innerHTML = '';

    // Sorted is false at the beginning
    if (!sorted) {
      copyTypes.sort((a, b) => a[1] - b[1]);

      copyTypes.forEach(([key, value]) => {
        if (!value) return;
        const workout = work.find(
          work => work.id === key && work[workType] === value
        );
        this._renderWorkout(workout);
      });
    } else {
      arrMapTypes.forEach(([key, value]) => {
        const workout = work.find(
          work => work.id === key && work[workType] === value
        );
        this._renderWorkout(workout);
      });
    }
  }
}

const app = new App();
