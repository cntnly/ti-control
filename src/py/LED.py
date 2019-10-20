import serial

class Led:
    # Constructor
    def __init__(self, port): 
        """Constructor that configures serial communication. """

        self._init_serial(port)
        # Connection status
        self._connected = False
        # Set state
        self._on = False
        self._pulsed = False
        self._shape = (500, 500) #pulse on, off durations

    ### Private functions
    def _init_serial(self, port): # Initialize serial connection 
        """Initialize serial connection on comport `port`. """

        self._ser = serial.Serial()

        # Serial settings
        self._ser.port = port
        self._ser.baudrate = 9600
        self._ser.bytesize = serial.EIGHTBITS
        self._ser.parity = serial.PARITY_ODD
        self._ser.stopbits = serial.STOPBITS_ONE
        self._ser.timeout = 0.1

    def _send(self, message): # Send command to device and parse answer
        """Send a command to the device if a serial connection is established. 
        
        # Arguments
        * `message` -- 
        """
        self._ser.write(message)

    ### Public functions
    def connect(self): # Establish serial connection with device. 
        """Open a serial connection to the device and set it into remote mode. Returns tuple (`success`, `message`). When `success` is false an error occured. """

        res = ''
        try:
            if not self._connected:
                self._ser.open()
                self._connected = True
                if self._connected:
                    res = 'Successfully connected to device'
            else:
                res = 'Already connected to device'
        except serial.SerialException as e:
            self._connected = False
            res = str(e) + ' >ERR_C-3'
        return self._connected, res

    def disconnect(self): # Close serial connection
        """Close serial connection"""
        self._ser.close()

    def reset(self): # Reset serial connection
        """Terminate serial connection and reconnect. """

        # Stop connection
        self._ser.close()
        self._connected = False
        # Re-initialize connection
        port = self._ser.port
        self._init_serial(port)
        # Connect
        self.connect()

    def toggle_on(self):
        if self._on:
            self._send('led off')
        else:
            self.send('led on')
        self._on = not self._on

    def toggle_pulsed(self):
        if self._on:
            if self._pulsed:
                self._send('led on')
            else:
                self._send('led pulsed %i %i'%(*self._shape))    
        self._pulsed = not self._pulsed

    def pulse_shape(self, timeon, timeoff):
        self._shape = (timeon, timeoff)
