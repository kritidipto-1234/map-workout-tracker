// navigator.geolocation.getCurrentPosition(()=>{alert("succesfuly got current location");},()=>    {
//     alert("Geolocation supported but failed to get current location");
// });

alert("hey im alert");

const mapContainer=document.querySelector('.mapId');
const list=document.querySelector('.list');
const form=document.querySelector('.form');
const formSelect=document.querySelector('select');
const lastLabel=document.querySelector('.lastlabel');
const lastInput=document.querySelector('.lastinpu');
const distance=document.querySelector('.distance');
const duration=document.querySelector('.duration');
const workoutList=document.querySelector('.workouts_list');
const showAllBtn=document.querySelector('.showAllBtn');

class Workout
{
    id=Date.now();
    date;
    duration;
    distance;
    coords;
    static months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    constructor(duration,distance,coords)
    {
        this.date=Workout.months[(new Date()).getMonth()]+" "+(new Date()).getDate();
        this.duration=duration;
        this.distance=distance;
        this.coords=coords;
    }

    preciseToOne(x)
    {
        x=String(x);
        const ind=x.indexOf('.');
        if (ind===-1)
            return x;
        return x.slice(0,ind+2);
    }
}

class Running extends Workout
{
    type="Running";
    cadence;
    pace;
    constructor(duration,distance,coords,cadence)
    {
        super(duration,distance,coords);
        this.cadence=cadence;
        this.pace=this.duration/this.distance;
        this.pace=this.preciseToOne(this.pace);
    }
}

class Cycling extends Workout
{
    type="Cycling";
    elevation;
    speed;
    constructor(duration,distance,coords,elevation)
    {
        super(duration,distance,coords);
        this.elevation=elevation;
        this.speed=this.distance/(this.duration/60);
        this.speed=this.preciseToOne(this.speed);
    }
}

class App
{
    mymap;//stores the LeafLet map object
    workouts=[];//stores all of users workouts
    currentPosition={lat:null,lon:null};//stores the last clicked position on map
    markers=[];//stores all current markers of the map
    constructor()
    {
        this.makeMap();
        form.style.display="none";
        this.fetchDataFromLocal();
        this.displayWorkouts();
        this.mymap.on('click',this.onMapClick.bind(this));
        form.addEventListener('keydown',this.onFormSubmit.bind(this));
        formSelect.addEventListener('change',this.toggleElevationField);
        workoutList.addEventListener('click',this.goToWorkout.bind(this));
        showAllBtn.addEventListener('mousedown',this.showAllWorkouts.bind(this));
    }
    
    fetchDataFromLocal()
    {
        this.workouts=JSON.parse(localStorage.getItem("workouts_of_mapty"))||[];
    }

    makeMap()//this function sets up the working map
    {
        this.mymap = L.map(mapContainer,{center:[30,-90],zoom: 13});
        const tileURl='https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
        const tileObj=
        {
            maxZoom: 19,
            attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        };
        const tiles=L.tileLayer(tileURl,tileObj);
        this.mymap.addLayer(tiles);//OpenStreet tile service is now being used with leaflet map
        if (!navigator.geolocation)
            alert("No geolocation support");
        navigator.geolocation.getCurrentPosition(this.setMapToCurrentLocation.bind(this),this.geolocationFail);
    }

    geolocationFail()
    {
        alert("Geolocation supported but failed to get current location");
    }

    setMapToCurrentLocation(position)//sets map to given geolocation object
    {
        const lat=position.coords.latitude;
        const lon=position.coords.longitude;
        this.mymap.setView([lat,lon],13);
    }

    onMapClick(e) 
    {
        ({latlng:{lat:this.currentPosition.lat,lng:this.currentPosition.lon}}=e);
        form.style.display="grid";
        distance.focus();
    }

    delete_workout(workout)
    {
        const rmvWorkoutIndex=this.workouts.findIndex(w=>w.id==workout.dataset.id);
        this.workouts.splice(rmvWorkoutIndex,1);
        localStorage.setItem("workouts_of_mapty", JSON.stringify(this.workouts));//since new workout is added update the local storage version too
        this.displayWorkouts();
    }

    onFormSubmit(e)
    {
        if (!e.target.classList.contains('input') || e.key!="Enter" || e.target==formSelect)
            return;
        const dist=Number(distance.value);
        const dur=Number(duration.value);
        const cadElev=Number(lastInput.value);
        if (!dist||!dur||!cadElev||dist<1||dur<1)
        {
            alert("All inputs must be positive numbers");
            return;
        }
        let job;
        if (formSelect.value=="Running")
            job=new Running(dur,dist,{...this.currentPosition},cadElev)
        else if (formSelect.value=="Cycling")
            job=new Cycling(dur,dist,{...this.currentPosition},cadElev)
        this.workouts.push(job);
        localStorage.setItem("workouts_of_mapty", JSON.stringify(this.workouts));//since new workout is added update the local storage version too
        this.displayWorkouts();
    }

    toggleElevationField(e)
    {
        if (formSelect.value=="Running")
        {
            lastLabel.textContent="Cadence";
            lastInput.setAttribute('placeholder','step/min');
        }
        else if(formSelect.value="Cycling")
        {
            lastLabel.textContent="Elev Gain";
            lastInput.setAttribute('placeholder','meters');
        }
        lastInput.value="";
    }

    displayWorkouts()//this function displays workouts both on map and list
    {
        this.markers.forEach(m=>this.mymap.removeLayer(m));//remove all markers already there from map
        this.markers=[];//then remove markers object array too
        workoutList.innerHTML="";//remove all workouts from list

        for(let i of this.workouts)
        {
            let marker=new L.marker([i.coords.lat,i.coords.lon]);
            this.mymap.addLayer(marker);
            const popupOptions={maxWidth:250,maxHeight:100,autoPan:false,closeOnClick:false,autoClose:false,className:'popup'};
            const popupObj=L.popup(popupOptions).setContent(`${i.type=="Running"?'🏃‍♂️ Running':'🚴‍♀️ Cycling'} on ${i.date}`);
            marker.bindPopup(popupObj).openPopup();
            this.markers.push(marker);
            const newListElement=document.createElement('div');
            newListElement.classList.add('workout');
            let lastPart;
            if (i.type=="Cycling")
            {
                popupObj._container.style.borderLeft="6px solid yellow";
                newListElement.style.borderLeft="6px solid yellow";
                lastPart=`⚡️${i.speed} KM/H ⛰${i.elevation} M</div>`;
            }
            else if(i.type=="Running")
            {
                lastPart=`⚡️${i.pace} MIN/KM 🦶🏼${i.cadence} SPM</div>`;
            }
            newListElement.innerHTML=`<div class="title">${i.type=="Running"?'Running':'Cycling'} on ${i.date}</div><br><div class="icons">${i.type=="Running"?'🏃‍♂️':'🚴‍♀️'}${i.distance} KM ⏱${i.duration} MIN `+lastPart;
            newListElement.dataset.lat=`${i.coords.lat}`;
            newListElement.dataset.lon=`${i.coords.lon}`;
            newListElement.dataset.id=`${i.id}`;
            const close=document.createElement('div');
            close.classList.add('close');
            close.textContent='X';
            newListElement.append(close);
            workoutList.prepend(newListElement);
        }
        form.style.display="none";
        duration.value="";
        distance.value="";
        lastInput.value="";
    }

    goToWorkout(e)//after clicking on a workout on list moves map to workout coords
    {
        const workout=e.target.closest('.workout');
        if (!workout)
            return;
        if (e.target.classList.contains('close'))
        {
            this.delete_workout(workout);
            return;
        }
        this.mymap.setView([workout.dataset.lat,workout.dataset.lon],13);
    }

    showAllWorkouts()
    {
        const bounds=this.markers.map(e=>{const {lat,lng}=e.getLatLng();return [lat,lng];}); 
        this.mymap.fitBounds(bounds,{padding: [20, 20]});
    }
}

//const newapp=new App();