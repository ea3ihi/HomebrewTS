import { HBPeer } from "./HBPeer";
import { format, transports, createLogger, Logger } from "winston";
import { HBPeerConfig, HBStatus, DMRFrameType, DMRDataType } from "./HBUtils";
import { DMRFrame } from "./DMRFrame";
import { HBMonitor } from "./HBMonitor";


/**
 * A simple bridge that will connect to two masters
 * and send dmrd frames to each other
 */

const peerConfig1: HBPeerConfig = {
    port: 50125, 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5,
    
    id:214381405, //0CC73359
    masterPort: 62031,
    
    masterAddress: "127.0.0.1",
    //masterAddress: "84.232.5.113",

    masterPassword: "passw0rd",
    masterId: 2141381498,

    callSign: "ea3ihi",
    rxFreq: "449000000",
    txFreq: "444000000",
    txPower: "25",
    colorCode: "01",
    latitude: "38.0000",
    longitude: "-095.0000",
    height: "75",
    location: "The Internet",
    description: "A typescript based repeater",
    slots: "4",
    url: "www.google.com",
    softwareId: "20170620",
    packageId: "MMDVM_HBlink",
    };

 
const peerConfig2: HBPeerConfig = {
    port: 50126, 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5,
    
    id:214381406, //0CC73359
    masterPort: 62031,
    
    //masterAddress: "127.0.0.1",
    masterAddress: "84.232.5.113",

    masterPassword: "passw0rd",
    masterId: 2141,

    callSign: "ea3ihi",
    rxFreq: "449000000",
    txFreq: "444000000",
    txPower: "01",
    colorCode: "01",
    latitude: "41.4016",
    longitude: "-2.1830",
    height: "75",
    location: "The Internet",
    description: "A typescript based homebrew bridge",
    slots: "4",
    url: "www.google.com",
    softwareId: "20191120",
    packageId: "MMDVM_HBTS",
    };

/**
 * Configure logging
 */
const logConfig = {
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: 'Bridge' },
    transports: [
      //
      // - Write to all logs with level `info` and below to `combined.log` 
      // - Write all logs error (and below) to `error.log`.
      //
      new transports.File({ filename: './log/error.log', level: 'error' }),
      new transports.File({ filename: './log/combined.log' }),
      //log to console
      new transports.Console({format: format.combine(
        format.colorize(),
        format.simple(),
        format.timestamp()
        ), level:'info'})
    ]
  }


class Bridge {

    peer1: HBPeer;
    peer2: HBPeer;
    logger: Logger;

    monitor: HBMonitor = new HBMonitor();

    constructor () {
        this.peer1 = new HBPeer(peerConfig1, logConfig);
        this.peer2 = new HBPeer(peerConfig2, logConfig);

        this.peer1.onDmr( (data) => this.onDMR1(data));
        this.peer2.onDmr( (data) => this.onDMR2(data));

        this.logger = createLogger(logConfig);

        this.monitor.addPeer(this.peer1);
        this.monitor.addPeer(this.peer2);

        setInterval( () => this.statistics(), 60000);
    }

    onDMR1(data: Buffer): void {

        if (this.peer2.status == HBStatus.connected) {
            this.peer2.sendMaster(data);

            const frame: DMRFrame = DMRFrame.fromBuffer(data);
            if (frame.dmrData.frameType == DMRFrameType.DATA_SYNC && DMRDataType.VOICE_HEADER) {
                this.logger.info(`Peer1 to Peer2 Source: ${frame.dmrData.source} Destination: ${frame.dmrData.destination}`);
            }

            
        }
    }

    onDMR2(data: Buffer): void {
        if (this.peer1.status == HBStatus.connected) {
            this.peer1.sendMaster(data);
            const frame: DMRFrame = DMRFrame.fromBuffer(data);
            if (frame.dmrData.frameType == DMRFrameType.DATA_SYNC && frame.dmrData.dataType == DMRDataType.VOICE_HEADER) {
                this.logger.info(`Peer2 to Peer1 Source: ${frame.dmrData.source} Destination: ${frame.dmrData.destination}`);
            }
        }
    }


    /**
     * Print some stream statistics
     */
    statistics() {
        //this.logger.info(JSON.stringify(this.peer1.getStreams()));
        //this.logger.info(JSON.stringify(this.peer2.getStreams()));
    }
}


//main

let bridge = new Bridge();
