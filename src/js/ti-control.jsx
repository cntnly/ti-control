/*
# SocketIO signals
* `connect` -- Serial connection was established.
* `disconnect` -- Serial connection was disconnected.
* `remote` -- Remote state was toggled.
* `power` -- Output was turned on/off.
* `newVoltage` -- New voltage was set. msg['voltage'] is the new voltage
* `newCurrent` -- New current was set. msg['current'] is the new current
* `newState` -- Send out state of device.
* `interlock` -- Signal sent 10 minutes before the interlock trips.

# API calls
* `/power` 
* `/setVoltage`
* `/setCurrent`
* `/resetInterlock`

*/
import React from "react";
import io from "socket.io-client";
import axios from "axios";


class TIControl extends React.Component {
    constructor(props) { // Constructor
        super(props);
        this.api = props.api;
        this.socket = io(this.api);
        this.state = {led_connected: false, led_on: 'false',
                      led_pulsed: 'false', led_shape: [500,500],
                    };
        this.lockGUI = false;

        this.handleVoltageChange = this.handleVoltageChange.bind(this);
        this.handleCurrentChange = this.handleCurrentChange.bind(this);
        this.handleInterlockChange = this.handleInterlockChange.bind(this);
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleInterlock = this.handleInterlock.bind(this);
    }
    componentDidMount() { // Connect signals and get state
        this.socket.on("ledNewState", (res) => this.handleLedUpdate(res));
        this.socket.on("cameraNewState", (res) => this.handleCameraUpdate(res));
        axios.get(this.api + "/get").then(res => this.handleLedUpdate(res));
    }
    handleVoltageChange(e) { // Change voltage setting on device
        // Push new value to the server. This will trigger a newState signal that updates the gui.
        const newVoltage = this.state.setVoltage
        this.lockGUI = false; // Release lock that prevents gui from updating
        axios.get(this.api + "/setVoltage", {params: {val: newVoltage}});
    }
    handleCurrentChange(e) { // Change current setting on device
        // Push new value to the server. This will trigger a newState signal that updates the gui.
        const newCurrent = this.state.setCurrent
        this.lockGUI = false; // Release lock that prevents gui from updating
        axios.get(this.api + "/setCurrent", {params: {val: newCurrent}});
    }
    handleInterlockChange(e) { // Change the state of the interlock
        // Push new interlock state to the server. This will trigger a newState signal.
        const newState = this.state.interlock ? 0 : 1;
        axios.get(this.api + "/toggleInterlock", {params: {state: newState}});
    }
    handleButtonClick() { // Toggle ouput state
        // Push new state to the server. This will trigger a newState signal that updates the gui.
        const newOutputState = !this.state.output;
        const newOutputStateText = newOutputState ? 'on' : 'off';
        axios.get(this.api + "/power", {params: {state: newOutputStateText}});
    }
    handleInputChange(e) { // Change input fields
        // Change voltage and current input text and make sure they stay in range.
        const caller = e.target.id;
        const val = e.target.value;

        if (caller === 'voltageIn') {
            if (val >= 0 && val <= 42) {
                this.setState({setVoltage: val});
            }
        }
        else if (caller === 'currentIn') {
            if (val >= 0 && val <= 10) {
                this.setState({setCurrent: val});
            }
        }
    }
    handleLedUpdate(res) { // Update set and actual values for led
        // Update the gui with values received from the server. Only update when none of the inputs is selected.

        if (res['success'] && !this.lockGUI) { // correct command received and gui not locked
            const data = res['msg'];
            const led_on = (data['led_on'] === 'on' ? true : false);
            const outputState = (data['led_on'] === 'on' ? true : false);
           
            this.setState({led_on: data['led_on'], led_pulsed: data['led_pulsed'],
                           led_shape: data['led_shape'], led_connected: true 
                           });
        }
        else if (!res['success']) { // could not read device status
            this.setState({connected: false});
        }
    }
    handleInterlock(){ // Ask whether oven is still used after 10 pm
        // Open a pop-up window. When clicking `ok` the interlock will be reset otherwise the power supply will be turned off.
        const resetInterlock = window.confirm("Reset interlock?");
        if (resetInterlock) { // Reset interlock for 30 minutes
            axios.get(this.api + "/resetInterlock");
        }
        else { // turn power supply off
            axios.get(this.api + "/power", {params: {state: 'off'}});
        }
        console.log(disableInterlock)

    }
    render() { // Render gui
        const btnClass = this.state.output ? "btn btn-success" : "btn btn-secondary";
        const btnText = this.state.output ? "Disable output" : "Enable output";
        const interlockState = this.state.interlock;

        const outputButton = <button type="button" 
                                     onClick={this.handleButtonClick} 
                                     disabled={!this.state.connected}
                                     className={btnClass}>{btnText}</button>;
        
        const voltageInput = <input className="form-control"
                                    disabled={!this.state.connected}
                                    type="number" 
                                    id="voltageIn"
                                    value={this.state.setVoltage} 
                                    onChange={this.handleInputChange}
                                    onFocus={() => this.lockGUI = true}
                                    onBlur={this.handleVoltageChange} />;

        const currentInput = <input className="form-control"
                                    disabled={!this.state.connected}
                                    type="number" 
                                    id="currentIn"
                                    value={this.state.setCurrent} 
                                    onChange={this.handleInputChange}
                                    onFocus={() => this.lockGUI = true}
                                    onBlur={this.handleCurrentChange} />;

        const interlockInput = <input className="form-check-input"
                                      disabled={!this.state.connected}
                                      type="checkbox"
                                      id="interlockIn"
                                      checked={interlockState}
                                      onChange={this.handleInterlockChange} />

        return <form>
                    <div className="form-group">
                        <div className="form-group row">
                            <div className="input-group col-sm-4">
                                <div className="input-group-prepend">
                                    <span className="input-group-text">Voltage (V)</span>
                                </div>
                                {voltageInput}
                                <div className="input-group-append">
                                    <span className="input-group-text text-secondary" style={{width: "4.5em"}}>
                                    {this.state.actVoltage} V</span>
                                </div>
                            </div>
                            <div className="col-sm-4"></div>
                        </div>
                        <div className="form-group row">
                            <div className="input-group col-sm-4">
                                <div className="input-group-prepend">
                                    <span className="input-group-text">Current (A)</span>
                                </div>
                                {currentInput}
                                <div className="input-group-append">
                                    <span className="input-group-text text-secondary" style={{width: "4.5em"}}>{this.state.actCurrent} A</span>
                                </div>
                            </div>
                            <div className="col-sm-4"></div>
                        </div>
                        <div className="form-group row">
                            <div className="input-group col-sm-2">{outputButton}</div>
                            <div className="form-check col-sm-2">
                                {interlockInput}
                                <label className="form-check-label" htmlFor="interlockIn">Interlock enabled
                                </label> 
                            </div>
                            <div className="col-sm-4"></div>
                        </div>
                    </div>  
                </form>
    }
}

export default TIControl;