'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
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
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const addWorks = document.querySelector('.works');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let workk;
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #distance = [];
  editWork = false;
  sorting = true;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    this.editWork = false;
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
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

    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      if (!this.editWork) {
        const { lat, lng } = this.#mapEvent.latlng;
        workout = new Running([lat, lng], distance, duration, cadence);
      }
      if (this.editWork) {
        this.#editWorkout(workk, type, distance, duration, cadence);
      }
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      if (!this.editWork) {
        const { lat, lng } = this.#mapEvent.latlng;
        workout = new Cycling([lat, lng], distance, duration, elevation);
      }
      if (this.editWork) {
        this.#editWorkout(workk, type, distance, duration, elevation);
        console.log(workk);
      }
    }

    if (!this.editWork) {
      // Add new object to workout array
      this.#workouts.push(workout);

      this.#distance.push({
        distance: workout.distance,
        id: workout.id,
      });

      // Render workout on list
      this._renderWorkout(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Hide form + clear input fields
      this._hideForm();

      // Set local storage to all workouts
      this._setLocalStorage(workout);
    }
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
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
        </div>
        
    `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      <div class="edit__delete">
        <button class="edit">✏️</button>
        <button class="delete">❌</button>
      </div>
    </li>
    `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>      
      <div class="edit__delete">
        <button class="edit">✏️</button>
        <button class="delete">❌</button>
      </div>
    </li>
    `;

    addWorks.insertAdjacentHTML('afterbegin', html);
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
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');
    if (workoutEl) {
      if (
        workoutEl.classList.contains('workout--running') ||
        workoutEl.classList.contains('workout--cycling')
      ) {
        workk = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        if (e.target.classList.contains('edit')) {
          this.editWork = true;
          form.classList.remove('hidden');
          inputDistance.focus();
        }
        if (e.target.classList.contains('delete')) {
          let deleted = this.#workouts.findIndex(work => work.id === workk.id);
          console.log(deleted);
          //key ile deleted uyusmazligi icin. Eger deleted localde yoksa olana kadar arttir
          while (!localStorage.getItem(`${deleted}`)) {
            deleted++;
          }
          localStorage.removeItem(`${deleted}`);
        }

        if (!workoutEl) return;

        this.#map.setView(workk.coords, this.#mapZoomLevel, {
          animate: true,
          pan: {
            duration: 1,
          },
        });
      }
    } else {
      if (e.target.classList.contains('deleteAll')) {
        this.reset();
      }
      if (e.target.classList.contains('sort')) {
        addWorks.innerHTML = '';
        this.#sortWorkouts(this.sorting);
        this.sorting = !this.sorting;
      }
    }
  }
  #editWorkout(workk, type, distance, duration, cadOrEl) {
    const editData = this.#workouts.findIndex(work => work.id === workk.id);

    localStorage.removeItem(`${editData}`);
    workk.type = type;
    workk.distance = distance;
    workk.duration = duration;
    if (type === 'running') workk.cadence = cadOrEl;
    if (type === 'cycling') workk.elevation = cadOrEl;

    console.log(editData);
    localStorage.setItem(`${editData}`, JSON.stringify(workk));
  }
  #sortWorkouts(sort) {
    const yedek = sort
      ? this.#distance.toSorted(function (a, b) {
          return b.distance - a.distance;
        })
      : this.#distance;

    let index;
    for (let i = 0; i < yedek.length; i++) {
      index = yedek.length - i - 1;
      this.#workouts.forEach(
        function (workout) {
          if (
            workout.distance === yedek[i].distance &&
            workout.id === yedek[i].id
          ) {
            this._renderWorkout(workout);
          }
        }.bind(this)
      );
    }
  }

  _setLocalStorage(workout) {
    localStorage.setItem(`${localStorage.length}`, JSON.stringify(workout));
  }

  _getLocalStorage() {
    let newWork;
    let workToObject;

    for (let i = 0; i < localStorage.length + 1; i++) {
      if (localStorage.getItem(`${i}`)) {
        workToObject = JSON.parse(localStorage.getItem(`${i}`));

        if (workToObject.type === 'running') {
          newWork = new Running(
            workToObject.coords,
            workToObject.distance,
            workToObject.duration,
            workToObject.cadence
          );
        }
        if (workToObject.type === 'cycling') {
          newWork = new Cycling(
            workToObject.coords,
            workToObject.distance,
            workToObject.duration,
            workToObject.elevationGain
          );
        }
        this.#workouts.push(newWork);
        console.log(newWork);
        console.log(this.#workouts);
        this.#distance.push({
          distance: newWork.distance,
          id: newWork.id,
        });
        console.log(this.#distance);
        //this.#distance.push(newWork.distance);
      }
    }

    this.#workouts.forEach(
      function (work) {
        this._renderWorkout(work);
      }.bind(this)
    );
  }

  reset() {
    for (let i = 0; i <= localStorage.length + 1; i++) {
      if (localStorage.getItem(`${i}`)) {
        localStorage.removeItem(`${i}`);
      }
    }
  }
}

const app = new App();
