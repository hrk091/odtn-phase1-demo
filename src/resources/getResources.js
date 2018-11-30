import {
  getConnectivityServices,
  getSipDetail,
  getSips,
} from './dcs'
import {
  getDevices,
  getPorts,
} from './onos'


/**
 * Provide onos port list along with sip uuid.
 * @returns {Promise<*[]>}
 */
export function getResources() {

  return Promise.all([getDevices(), getSips()])
    .then(([devices, sips]) => {
      if(!devices || !sips){
        throw new Error('Device not found')
      }
      const promisePorts = Promise.all(devices.map(device => {
        return getPorts(device.id)
      }))
      const promiseSipDetails = Promise.all(sips.map(sip => {
        return getSipDetail(sip.uuid)
      }))
      return Promise.all([promisePorts, promiseSipDetails, getConnectivityServices()])
    })
    .then(([deviceDetails, sipDetails, connectivityService]) => {

      const sipIdMap = sipDetails.reduce((_sipIdMap, sipDetail) => {
        _sipIdMap[sipDetail.name.filter(kv => kv["value-name"] === "onos-cp")[0].value] = sipDetail.uuid
        return _sipIdMap
      }, {})
      console.log(sipIdMap)

      deviceDetails.forEach(deviceDetail => {
        deviceDetail.ports.forEach(port => {
          const key = `${port.element}/${port.port}`
          if(sipIdMap[key]) {
            port.sipId = sipIdMap[key]
          }
        })
      })

      return [ deviceDetails || [], connectivityService || [] ]
    })
    .catch(err => {
      console.error(err)
    })

}