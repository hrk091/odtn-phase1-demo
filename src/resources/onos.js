export function getDevices() {

  return new Promise((resolve, reject) => {
    fetch(`/onos/devices`, {
      method: 'GET',
    })
      .then(res => {
        if (res.ok) {
          res.json().then(data => resolve(data["devices"]))
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}

export function getPorts(devices) {

  return new Promise((resolve, reject) => {
    fetch(`/onos/devices/${devices}/ports`, {
      method: 'GET',
    })
      .then(res => {
        if (res.ok) {
          res.json().then(data => resolve(data))
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}
