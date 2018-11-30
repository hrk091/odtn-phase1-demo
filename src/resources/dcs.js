export function getSips() {

  return new Promise((resolve, reject) => {
    fetch(`/dcs/operations/tapi-common:get-service-interface-point-list`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}"
    })
      .then(res => {
        if (res.ok) {
          res.json().then(data => resolve(data["tapi-common:output"]["sip"]))
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}

export function getSipDetail(uuid) {

  return new Promise((resolve, reject) => {
    fetch(`/dcs/data/tapi-common:context/service-interface-point=${uuid}`, {
      method: 'GET',
    })
      .then(res => {
        if (res.ok) {
          res.json().then(data => resolve(data["tapi-common:service-interface-point"][0]))
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}


export function getConnectivityServices() {

  return new Promise((resolve, reject) => {
    fetch(`/dcs/operations/tapi-connectivity:get-connectivity-service-list`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: '{}'
    })
      .then(res => {
        console.log(res)
        if (res.ok) {
          res.json().then(data => resolve(data["tapi-connectivity:output"]["service"]))
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}


export function createConnectivityService(sip1, sip2) {

  return new Promise((resolve, reject) => {
    fetch(`/dcs/operations/tapi-connectivity:create-connectivity-service`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: getCreateRequestBody(sip1, sip2)
    })
      .then(res => {
        console.log(res)
        if (res.ok) {
          res.json().then(data => resolve(data["tapi-connectivity:output"]["service"]))
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}


export function deleteConnectivityServices(uuid) {

  return new Promise((resolve, reject) => {
    fetch(`/dcs/operations/tapi-connectivity:delete-connectivity-service`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: getDeleteRequestBody(uuid)
    })
      .then(res => {
        console.log(res)
        if (res.ok) {
          resolve()
        } else {
          reject(res.text())
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}


function getCreateRequestBody(sip1, sip2){
  return `{
    "tapi-connectivity:input":
    {
        "end-point" : [
            {
                "local-id": "id1",
                "service-interface-point": {
                    "service-interface-point-uuid" : "${sip1}"
                }
            }
            ,
            {
                "local-id": "id2",
                "service-interface-point": {
                    "service-interface-point-uuid" : "${sip2}"
                }
            }
        ]
    }
}`
}

function getDeleteRequestBody(uuid){
  return `{
    "tapi-connectivity:input":
    {
        "service-id-or-name" : "${uuid}"
    }
}`
}