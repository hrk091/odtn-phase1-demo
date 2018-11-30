import green from '@material-ui/core/colors/green'
import red from '@material-ui/core/colors/red'
import {
  Button,
  FormControl,
  Grid,
  Icon,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  SnackbarContent,
} from '@material-ui/core/es/index'
import SendIcon from '@material-ui/icons/Send'
import DeleteIcon from '@material-ui/icons/Delete'
import withStyles from '@material-ui/core/es/styles/withStyles'
import React, {
  Component,
  createRef,
} from 'react';
import {
  Network,
  DataSet,
} from 'vis'
import onos from './onos.png'
import './App.css';
import {
  createConnectivityService,
  deleteConnectivityServices,
} from './resources/dcs'
import { getResources } from './resources/getResources'
import { range } from 'lodash'


const INTERVAL = 10000

const GRAPH_OPTION = {
  // edges: {
  //   smooth: true,
  // },
}

const SPACE = {
  v: 15,
  h: 100,
}

const DEBUG = false

const styles = theme => ( {
  root: {
    flexGrow: 1,
  },
  main: {
    marginTop: '20px',
    padding: '10px',
    border: '0.5px solid  #666666',
  },
  form: {
    minWidth: 120,
    display: 'flex',
    flexWrap: 'wrap',
  },
  button: {
    margin: theme.spacing.unit,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
} )


class App extends Component {

  constructor( props ) {
    super()
    this.state = {
      connectivityServices: [],
      devices: [],
      network: {},
      request: {
        left: '',
        right: '',
      },
      message: '',
      messageColor: green[600],
      open: false,
    }
    this.appRefList = range( 8 ).map( () => createRef() )
  }

  componentDidMount = () => {
    this.updateResource()
    setTimeout( this.updateResource, 100 )
    setInterval( this.updateResource, INTERVAL )
  }

  updateResource = () => {
    getResources().then( ([ devices, connectivityServices ]) => {
      console.log(connectivityServices)
      const portMap = this.getPortMap( devices )
      const network = Object.values( portMap ).map( this.setupGraph )
      this.setState( {
        devices,
        network,
        connectivityServices,
      } )
    } )
  }

  getPortMap = ( devices ) => {
    const portMap = {}
    range( 8 ).forEach( idx => portMap[ idx ] = [] )

    devices.forEach( ( device, deviceIdx ) => {
      device.ports.forEach( port => {
        const re = /\[\d*\]\((\d*)\)/
        const portNum = re.exec( port.port )[ 1 ]
        const lineNum = Math.floor( ( portNum - 1 ) % 100 / 2 )

        port.id = `${port.element}/${portNum}`
        port.portNum = portNum
        port.isClient = Math.floor( portNum / 100 ) === 1
        port.isLeft = deviceIdx === 0
        port.color = !port.isClient ? '#888888' : deviceIdx === 0 ? '#DD8800' : '#0088DD'
        port.isEven = port.portNum % 2 === 0

        portMap[ lineNum ].push( port )
      } )
    } )

    return portMap
  }

  getAssociatedConnectivity = ( uuid ) => {
    let oppositePortUuid = null
    let connectivitySrv = null
    this.state.connectivityServices.forEach(srv => {
      let isTarget = false
      srv['end-point'].forEach(ep => {
        const epUuid = ep['service-interface-point']['service-interface-point-uuid']
        if(uuid === epUuid){
          connectivitySrv = srv
          isTarget = true
        }
      })
      if(isTarget){
        oppositePortUuid = srv['end-point'].filter(ep => {
          const epUuid = ep['service-interface-point']['service-interface-point-uuid']
          return epUuid !== uuid
        })[0]['service-interface-point']['service-interface-point-uuid']
      }
    })
    return [ connectivitySrv, oppositePortUuid ]
  }

  setupGraph = ( ports, idx ) => {

    // predefined port
    const nodes = ports
      .filter(port => port.isClient || !port.isEven)
      .map( port => {
        const [ x, y ] = getPosition( port )
        return {
          id: port.id,
          label: port.isClient ? port.portNum : '',
          x,
          y,
          shape: 'ellipse',
          size: 20,
          color: port.color,
          physics: false,
          // font: '20px',
        }
      } )

    // predefined line
    const edgeMap = {}
    ports.forEach( port => {
      if ( port.isClient ) {
        return
      }
      edgeMap[ port.portNum ] = edgeMap[ port.portNum ] || {}
      if ( port.isLeft ) {
        edgeMap[ port.portNum ].from = port.id
      } else {
        edgeMap[ port.portNum ].to = port.id
      }
      edgeMap[ port.portNum ].label = 'optical line'
    } )
    const externalEdges = Object.values( edgeMap )

    // existing connectivity service
    const internalEdges = []
    ports.forEach( port => {
      if ( !port.isClient ) {
        return
      }
      if ( !port.isLeft ) {
        return
      }

      const [ connectivitySrv, oppositePortUuid ] = this.getAssociatedConnectivity(port.sipId)
      if(!connectivitySrv){
        return
      }
      const oppositePort = ports.filter(port => port.sipId === oppositePortUuid)[0]

      console.log(ports.filter(_port => !_port.isClient && _port.element === port.element))
      console.log(ports.filter(_port => !_port.isClient && _port.element === oppositePort.element))
      internalEdges.push({
        from: port.id,
        to: ports.filter(_port => !_port.isClient && _port.element === port.element)[0].id
      })

      internalEdges.push({
        from: oppositePort.id,
        to: ports.filter(_port => !_port.isClient && _port.element === oppositePort.element)[0].id
      })
    })

    const edges = externalEdges.concat(internalEdges)

    const data = {
      nodes: new DataSet( nodes ),
      edges: new DataSet( edges ),
    }
    return new Network( this.appRefList[ idx ].current, data, GRAPH_OPTION )
  }

  handleChange = ( ev ) => {
    if ( ev.target.name === 'left' ) {
      const request = Object.assign( {}, this.state.request, {
        left: ev.target.value,
      } )
      this.setState( {
        request,
      } )
    } else {
      const request = Object.assign( {}, this.state.request, {
        right: ev.target.value,
      } )
      this.setState( {
        request,
      } )
    }
  }

  handleCreate = () => {
    const { left, right } = this.state.request
    createConnectivityService(left, right)
      .then(json => {
        const message = DEBUG ? JSON.stringify(json) : 'Create ConnectivityService completed.'
        this.setState( {
          message,
          messageColor: green[600],
        } )
        setTimeout(this.updateResource, 1000)
      })
      .catch(err => {
        console.error(err)
        this.setState( {
          message: 'Error',
          messageColor: red[600],
        })
      })
  }

  handleDelete = () => {
    const { left, right } = this.state.request
    const [ connectivitySrv, clientPortUuid ] = this.getAssociatedConnectivity(left)
    if(clientPortUuid !== right){
      const message = 'Connectivity Service not found.'
      this.setState( {
        message
      } )
      return
    }
    deleteConnectivityServices(connectivitySrv.uuid)
      .then(json => {
        const message = 'Delete ConnectivityService completed.'
        this.setState( {
          message,
          messageColor: green[600],
        } )
        setTimeout(this.updateResource, 1000)
      })
      .catch(err => {
        console.error(err)
        this.setState( {
          message: 'Error',
          messageColor: red[600],
        } )
      })
  }

  handleSnackClose = () => {
    this.setState({
      message: ''
    })
  }


  render() {

    const { classes } = this.props

    const { devices } = this.state

    const leftSipPorts = devices[ 0 ] ? devices[ 0 ].ports.filter( port => port.sipId ) : []
    const rightSipPorts = devices[ 1 ] ? devices[ 1 ].ports.filter( port => port.sipId ) : []

    return (
      <div className="App">
        <header className="App-header">
          <img src={ onos } className="App-logo" alt="logo"/>
          <p>
            ODTN sample app
          </p>
        </header>
        <Grid container className={ classes.root } spacing={ 24 }>
          <Grid item xs={ 2 }/>
          <Grid item container xs={ 8 } spacing={ 24 }>
            <Grid item xs={ 4 }>
              <form>
                <FormControl className={ classes.form }>
                  <InputLabel>Client Port 1</InputLabel>
                  <Select value={ this.state.request.left }
                          onChange={ this.handleChange }
                          inputProps={ {
                            name: 'left',
                            id: 'left',
                          } }>
                    {
                      leftSipPorts.map( port => (
                        <MenuItem key={ port.id } value={ port.sipId }>{ port.id }</MenuItem>
                      ) )
                    }
                  </Select>
                </FormControl>
              </form>
            </Grid>
            <Grid item xs={ 4 }>
              <form>
                <FormControl className={ classes.form }>
                  <InputLabel>Client Port 2</InputLabel>
                  <Select value={ this.state.request.right }
                          onChange={ this.handleChange }
                          inputProps={ {
                            name: 'right',
                            id: 'right',
                          } }>
                    {
                      rightSipPorts.map( port => (
                        <MenuItem key={ port.id } value={ port.sipId }>{ port.id }</MenuItem>
                      ) )
                    }
                  </Select>
                </FormControl>
              </form>
            </Grid>

            <Grid item xs={ 2 }>
              <Button variant="contained" className={ classes.button } onClick={this.handleCreate}>
                Create
                { /* This Button uses a Font Icon, see the installation instructions in the docs. */ }
                <SendIcon className={ classes.rightIcon }/>
              </Button>
            </Grid>

            <Grid item xs={ 2 }>
              <Button variant="contained" className={ classes.button } onClick={this.handleDelete}>
                Delete
                { /* This Button uses a Font Icon, see the installation instructions in the docs. */ }
                <DeleteIcon className={ classes.rightIcon }/>
              </Button>
            </Grid>

            <Grid item className={ classes.main } container xs={ 12 } spacing={ 24 }>
              <Grid item xs={ 1 }/>
              <Grid item xs={ 5 }>
                <p>Cassini 1</p>
                <p>{ devices[ 0 ] ? devices[ 0 ].id : '' }</p>
              </Grid>
              <Grid item xs={ 5 }>
                <p>Cassini 2</p>
                <p>{ devices[ 1 ] ? devices[ 1 ].id : '' }</p>
              </Grid>
              <Grid item xs={ 1 }/>
              {
                this.appRefList.map( ( appRef, idx ) => (
                  <Grid item xs={ 12 }>
                    <div className="odtn-graph" key={ `vis${idx}` } ref={ appRef }/>
                  </Grid>
                ) )
              }
            </Grid>

          </Grid>

          <Grid item xs={ 2 }/>
        </Grid>
        <Snackbar
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(this.state.message)}
          autoHideDuration={4000}
          onClose={this.handleSnackClose}
          ContentProps={{
            'aria-describedby': 'message-id',
          }}
        >
          <SnackbarContent
            style={{backgroundColor: this.state.messageColor}}
            message={this.state.message}
          />
        </Snackbar>
      </div>

    );
  }
}

export default withStyles( styles )( App );


function getPosition( port ) {
  const { v, h } = SPACE
  if ( port.isClient ) {
    if ( port.isLeft ) {
      if ( port.isEven ) {
        return [ h * -3, v * 1.5 ]
      } else {
        return [ h * -3, v * -1.5 ]
      }
    } else {
      if ( port.isEven ) {
        return [ h * 3, v * 1.5 ]
      } else {
        return [ h * 3, v * -1.5 ]
      }
    }

  } else {
    if ( port.isLeft ) {
      if ( port.isEven ) {
        return [ h * -1, v ]
      } else {
        return [ h * -1, v * -1 ]
      }
    }
    else {
      if ( port.isEven ) {
        return [ h, v ]
      } else {
        return [ h, v * -1 ]
      }
    }
  }
}