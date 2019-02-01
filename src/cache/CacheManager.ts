import powerbi from "powerbi-visuals-api";
import ILocalVisualStorageService = powerbi.extensibility.ILocalVisualStorageService;

import { ILocationDictionary } from "../geocoder/interfaces/geocoderInterfaces";
import { GlobeMapData, GlobeMapDataPoint } from "../interfaces/dataInterfaces";

import { MemoryCache } from "./memory";
import { LocalStorageCache } from "./localStorageAPI";
import { BingCache } from "./bing";
import { ICacheManager } from "./interfaces/ICacheManager";
import { CacheSettings } from "./../settings";

export class CacheManager {

    private memoryCache: ICacheManager;
    private localStorageCache: ICacheManager;
    private bingCache: ICacheManager;

    //private needToBeLoaded: { [i: string]: boolean };
    private coordsInLocalStorage: ILocationDictionary;

    constructor(localStorageService: ILocalVisualStorageService) {
        this.memoryCache = new MemoryCache(CacheSettings.MaxCacheSize, CacheSettings.MaxCacheSizeOverflow);
        this.localStorageCache = new LocalStorageCache(localStorageService);
        this.bingCache = new BingCache()
    }

    /*
    private getPlacesToBeLoaded(): string[] {
        const keys = Object.keys(this.needToBeLoaded);
        return keys.filter(b => this.needToBeLoaded[b]);
    }
    */
        
    
    public async loadCoordinates(locations: []string): Promise<ILocationDictionary> {
        var result = {};
        // Load from memory
        let coordsInMemory = await this.memoryCache.load(locations);   // result: [{"London": {"lat": 54, "lon": 34"},]
        let locationsInMemory = Object.keys(coordsInMemory);           // result: ["London", "Moscow"]
        locations = locations.filter(loc => locationsInMemory.includes(loc));  // ["Moscow"]
        
        if (locations.lenght === 0) {
            result = Object.assign({}, locationsInMemory);
            return new Promise<ILocationDictionary>(resolve => resolve(result));
        }
        
        // Load from localStorage
        if (!this.coordsInLocalStorage.length) {
            this.coordsInLocalStorage = await this.localStorageCache.load(locations);   // result: [{"Berlin": {"lat": 54, "lon": 34"},]
            let locationsInLocalStorage = Object.keys(this.coordsInLocalStorage);           // result: ["Berlin", "Paris"]
            locations = locations.filter(loc => locationsInMemory.includes(loc));  // ["Moscow"]

            if (locations.lenght === 0) {
                result = Object.assign({}, locationsInMemory, this.coordsInLocalStorage);
                return new Promise<ILocationDictionary>(resolve => resolve(result));
            }        
        }
        
        let coordsInBing = await this.bingCache.load(locations);
        result = Object.assign({}, locationsInMemory, this.coordsInLocalStorage, coordsInBing);
        
        return new Promise<ILocationDictionary>(resolve => resolve(result));   
    }
 
    /*
    public async loadCoordinatesOLD(data: GlobeMapData): Promise<ILocationDictionary> {
        this.needToBeLoaded = {};
        let locationRecords: ILocationDictionary;
   
        data.dataPoints.forEach((d: GlobeMapDataPoint) => {
            this.needToBeLoaded[d.placeKey] = true;
        });

        let memoryCoords: ILocationDictionary = {};
        let notLoadedCoordinates: string[] = this.getPlacesToBeLoaded();

        memoryCoords = await this.memoryCache.loadCoordinates(notLoadedCoordinates);
        for (let key in memoryCoords) {
            if (memoryCoords[key] && memoryCoords[key].longitude !== null && memoryCoords[key].latitude !== null) {
                this.needToBeLoaded[key] = false;
            }
        }

        notLoadedCoordinates = this.getPlacesToBeLoaded();
        if (!notLoadedCoordinates.length) {
            return new Promise<ILocationDictionary>(resolve => resolve(memoryCoords));
        }

        let localStorageCoords: ILocationDictionary = {};
        if (!this.localStorageCoordinates) {
            this.localStorageCoordinates = await this.localStorageCache.loadCoordinates(notLoadedCoordinates);
        } else {
            notLoadedCoordinates.forEach((key: string) => {
                if (this.localStorageCoordinates[key]) {
                    locationRecords[key] = this.localStorageCoordinates[key];
                }
            });
        }
        for (let key in localStorageCoords) {
            if (localStorageCoords[key] && localStorageCoords[key].longitude !== null && localStorageCoords[key].latitude !== null) {
                this.needToBeLoaded[key] = false;
            }
        }

        notLoadedCoordinates = this.getPlacesToBeLoaded();
        if (!notLoadedCoordinates.length) {
            locationRecords = Object.assign({}, memoryCoords, localStorageCoords);
            return new Promise<ILocationDictionary>(resolve => resolve(locationRecords));
        }

        // go to the bing!

    }
    */

    public async saveCoordinates(coordinates: ILocationDictionary): Promise<string> {
        await this.memoryCache.saveCoordinates(coordinates);        
        return this.localStorageCache.saveCoordinates(coordinates);        
    }
} 
