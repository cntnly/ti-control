"""Web interface for ps2000 power supply

# Socket io signals
All signals contain a dict {success, msg} where `success` is bool (whether the command was executed correctly) and `msg` contains additional information (usually a string except for `new...` signals).
* `connect` -- Serial connection was established.
* `disconnect` -- Serial connection was disconnected.
* `newVoltage` -- New voltage was set. msg['voltage'] is the new voltage
* `newCurrent` -- New current was set. msg['current'] is the new current
* `newState` -- Device state. Keys: setVoltage, actVoltage, setCurrent, actCurrent, output
* `interlock` -- Signal sent 10 minutes before the interlock trips.

# Debug mode
You can run the server locally with an emulator for the power supply using
`python ps2000Http.py --debug`. If you want to access the web interface, you will have to run it in debug mode as well using `npx parcel index.html` in the html folder.
"""


from flask import Flask, Response, request, render_template
from flask_socketio import SocketIO
from flask_cors import CORS
import json
import sys, time
# from threading import Lock
 
from camera_pi import Camera, Camera_dbg
from LED import Led

DEBUG = 1 # if '--debug' in sys.argv else 0

if DEBUG:
    print('Starting ti control debug dummy.')
    camera = Camera_dbg()
else:
    camera = Camera()
led = Led("dev/ttyAMC0")

app = Flask(__name__, static_url_path="", 
                      static_folder='./', 
                      template_folder='./')
CORS(app)
socketio = SocketIO(app)

thread = None
thread_lock = Lock() # thread lock for serial write

# Private functions
def parseInput(key): # Check whether request_data contains key.
    """Returns the value at key in the dict request_data if present. Otherwise returns `None`. """

    input_data = request.args.to_dict()

    try:
        return input_data[key]
    except KeyError:
        return None

def emitSignal(signal_name, success, msg=''): # emit a socket io signal
    """Emit a socket io signal `signal_name` containing a dict {success, msg}. """

    data = {'success': success, 'msg': msg}
    socketio.emit(signal_name, data)
    return data

def getDeviceState(): # Get device settings
    """Get device state"""
    return "abc"

def writeToDevice(com, arg=None): # Thread-save writing to device
    """Write a command `com` with optional argument `arg` to the device using a thread lock. Allowed `com` are
    * 'connect'
    * 'disconnect'
    * 'remote' where `arg` is 'on' or 'off'
    * 'power' where `arg` is 'on' or 'off'
    * 'setVoltage' where `arg` is the value
    * 'setCurrent' where `arg` is the value
    * 'get'
    """

    with thread_lock:
        # Turn on remote mode
        controller.remote(True)
        # Send command
        if com == 'connect':
            (success, msg) = controller.connect()
        elif com == 'disconnect':
            (success, msg) = controller.disconnect(disable_remote=True)
        elif com == 'remote':
            (success, msg) = controller.remote(arg)
        elif com == 'power':
            (success, msg) = controller.power(arg)
        elif com == 'setVoltage':
            (success, msg) = controller.setVoltage(arg)
        elif com == 'setCurrent':
            (success, msg) = controller.setCurrent(arg)
        elif com == 'get':
            (success, msg) = controller.get()
        # Turn off remote mode
        controller.remote(False)
    return (success, msg)

def backgroundThread(): # Background task
    """Background task that sends an update to all connected clients every 6 seconds and reports to grafana every minute. """

    while True:
        for i in range(10):
            (success, msg) = getDeviceState()
            if success:
                emitSignal('newState', success, msg)
            else: # try to reset the device
                emitSignal('newState', success, {})
                controller.reset()
            time.sleep(6)

# HTML endpoints
@app.route('/')
def render_webpage(): # Render webpage
    return render_template('index.html')

@app.route('/led_connect')
def connect(): # Establish serial connection. Emits `connect`
    """Establish the serial connection. Returns status. Emits `connect` socket io signal. """
    led.connect()
    data = emitSignal('led_connect')
    return json.dumps(data), 200

@app.route('/led_disconnect') 
def disconnect(): # Disconnect serial connection. Emits `disconnect`
    """Terminate serial connection and unlock device. """
    led.disconnect()
    data = emitSignal('disconnect')
    return json.dumps(data), 200

@app.route('/led_on')
def power(state=None): # Turn output on/off. Emits `power`
    """Turn output on/off. Emits `newState` socket io signal.

    # Arguments
    * `state` -- bool
    """

    if state is None:
        state = parseInput('state')
    if state is not None:
        (success, msg) = writeToDevice('power', state)
        if success:
            time.sleep(0.1)
            (success, msg) = getDeviceState()
            data = emitSignal('newState', success, msg)
        return json.dumps(data), 200
    else:
        return 'No state argument provided', 400

@app.route('/setVoltage')
def set_voltage(): # Set output voltage. Emits `newVoltage`
    """Set output voltage to `val`. Emits `newVoltage` socket io signal.
    
    # Arguments
    * `val` -- voltage value in [0, 42]
    """

    val = float(parseInput('val'))

    if val is not None:
        (success, msg) = writeToDevice('setVoltage', val)
        data = {'success': success, 'msg': msg}
        if success: # values were written correctly
            time.sleep(0.1)
            (success, msg) = getDeviceState()
            data = emitSignal('newState', success, msg)
        return json.dumps(data), 200
    else:
        return 'No voltage value `val` supplied', 400

@app.route('/setCurrent')
def set_current(): # Set the output current. Emits `newCurrent`
    """Set output current to `val`. Emits `newCurrent` socket io signal.
    
    # Arguments
    * `val` -- current value in [0, 10]
    """

    val = float(parseInput('val'))

    if val is not None:
        (success, msg) = writeToDevice('setCurrent', val)
        data = {'success': success, 'msg': msg}
        if success:
            time.sleep(0.1)
            (success, msg) = getDeviceState()
            data = emitSignal('newState', success, msg)
        return json.dumps(data), 200
    else:
        return 'No current value `val` supplied', 400

@app.route('/get')
def get(): # Get device settings. Emits `newState`
    """Get set and actual values. Emits `newState` signal.

    # Returns 
    * dict with keys: setVoltage, actVoltage, setCurrent, actCurrent, output
    where output is true when output is on.
    """

    (success, msg) = getDeviceState()
    data = emitSignal('newState', success, msg)
    return json.dumps(data), 200


# Connect to power supply and start background task
led.connect()

# if not DEBUG:
#     thread = socketio.start_background_task(target=backgroundThread)

if __name__ == '__main__':
    if DEBUG:
        socketio.run(app, host='localhost', port='5020', debug=True, use_reloader=False)
    else:
        socketio.run(app, host='0.0.0.0', port='5000', debug=False, use_reloader=False)
