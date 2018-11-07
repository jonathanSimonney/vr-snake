package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sync"

	"time"

	"golang.org/x/net/websocket"
)

/**********************/
/* Structures         */
/**********************/

// Représente une position sur la map
type Pos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// Serpent
type Snake struct {
	Kind string `json:"kind"`

	Name  string `json:"name"`
	Color string `json:"color"`
	Slot  int    `json:"slot"` //Not mandatory!!!

	State string `json:"state"` // "alive" ou "dead" ou "unplayed"

	// Tableau de positions
	// La tête est le premier élement du tableau
	Body []Pos `json:"body"`

	Direction string `json:"-"` //sert à indiquer la direction actuelle

	// WebSocket du client qui le controle
	// `json:"-"` ça veut dire qu'on l'envoie/reçoit pas par le JSON
	WS *websocket.Conn `json:"-"`
}

type Win struct {
	Kind   string `json:"kind"`
	Player string `json:"player"`
}

type Update struct {
	Kind string `json:"kind"`

	Snakes  []Snake `json:"snakes"`
	MapSize int     `json:"map_size"`

	Apples []Pos `json:"apples"`
}

// Structure envoyée dés que le front JS se connecte
type Init struct {
	Kind        string `json:"kind"`
	PlayersSlot []int  `json:"players_slot"`
	StateGame   string `json:"state_game"` // “waiting” or “playing” or “ended”
	MapSize     int    `json:"map_size"`
}

// Va nous permettre d'extraire juste le "kind"
type KindOnly struct {
	Kind string `json:"kind"`
}

type Move struct {
	Kind string `json:"kind"`
	Key  string `json:"key"`
}

type WebsocketSnakeLink struct {
	Websocket *websocket.Conn
	Index     int
}

/**********************/
/* Méthodes */
/**********************/

func (this *Snake) Move() {
	//console.log(direction, myObject);
	var newCoordinates = Pos{}
	key := this.Direction

	switch key {
	case "up":
		//console.log(myObject.Coordinates, myObject);
		newCoordinates = Pos{this.Body[0].X, this.Body[0].Y - 1}
		break
	case "left":
		newCoordinates = Pos{this.Body[0].X - 1, this.Body[0].Y}
		break
	case "down":
		newCoordinates = Pos{this.Body[0].X, this.Body[0].Y + 1}
		break
	case "right":
		newCoordinates = Pos{this.Body[0].X + 1, this.Body[0].Y}
		break
	default:
		fmt.Println("invalid direction supplied.No move will be made.", key)
	}

	if !coordIsGood(newCoordinates) {
		this.State = "dead"
		fmt.Println("a snake died!", this)
		return
	}

	this.Body = append([]Pos{newCoordinates}, this.Body...)
	if coordInSlice(newCoordinates, ArrayApples) {
		createApple(this.Body)
		fmt.Println(ArrayApples)

		for key, coord := range ArrayApples {
			if coord == newCoordinates {
				ArrayApples = append(ArrayApples[:key], ArrayApples[key+1:]...)
				break
			}
		}

	} else {
		this.Body = this.Body[:len(this.Body)-1]
	}
}

/**********************/
/* Variables globales */
/**********************/

//pour déterminer les règles du jeu.
var EarthIsFlat = true //todo make sure if this is false, snake reappear on other side of the map!

//sert à déterminer le temps entre chaque mouvement
var SleepInterval = 100 * time.Millisecond

//sert à avoir toutes les ws
var WsSlice = []WebsocketSnakeLink{}

// Sert à verrouiller les informations globales
var GeneralMutex sync.Mutex

// Etat du jeu
var StateGame = Init{
	Kind:        "init",
	StateGame:   "waiting",
	MapSize:     50,
	PlayersSlot: []int{1, 2, 3, 4},
}

//tableau de pommes
var ArrayApples = []Pos{}

var ArraySnake = []Snake{
	{Kind: "snake",
		Name:      "p1",
		Color:     "black",
		State:     "unplayed",
		Body:      []Pos{{X: 1, Y: 3}, {X: 1, Y: 2}, {X: 1, Y: 1}},
		Direction: "down",
	},
	{
		Kind:      "snake",
		Name:      "p2",
		Color:     "yellow",
		State:     "unplayed",
		Body:      []Pos{{X: 48, Y: 3}, {X: 48, Y: 2}, {X: 48, Y: 1}},
		Direction: "down",
	},
	{
		Kind:      "snake",
		Name:      "p3",
		Color:     "purple",
		State:     "unplayed",
		Body:      []Pos{{X: 48, Y: 46}, {X: 48, Y: 47}, {X: 48, Y: 48}},
		Direction: "up",
	},
	{
		Kind:      "snake",
		Name:      "p4",
		Color:     "white",
		State:     "unplayed",
		Body:      []Pos{{X: 1, Y: 46}, {X: 1, Y: 47}, {X: 1, Y: 48}},
		Direction: "up",
	},
}

/**********************/
/* Fonctions          */
/**********************/

/* Main */

func reinitServer() {
	//pour déterminer les règles du jeu.
	EarthIsFlat = true //todo make sure if this is false, snake reappear on other side of the map!

	//sert à déterminer le temps entre chaque mouvement
	SleepInterval = 100 * time.Millisecond

	//sert à avoir toutes les ws
	WsSlice = []WebsocketSnakeLink{}

	// Etat du jeu
	StateGame = Init{
		Kind:        "init",
		StateGame:   "waiting",
		MapSize:     50,
		PlayersSlot: []int{1, 2, 3, 4},
	}

	//tableau de pommes
	ArrayApples = []Pos{}

	ArraySnake = []Snake{
		{Kind: "snake",
			Name:      "p1",
			Color:     "black",
			State:     "unplayed",
			Body:      []Pos{{X: 1, Y: 3}, {X: 1, Y: 2}, {X: 1, Y: 1}},
			Direction: "down",
		},
		{
			Kind:      "snake",
			Name:      "p2",
			Color:     "yellow",
			State:     "unplayed",
			Body:      []Pos{{X: 48, Y: 3}, {X: 48, Y: 2}, {X: 48, Y: 1}},
			Direction: "down",
		},
		{
			Kind:      "snake",
			Name:      "p3",
			Color:     "purple",
			State:     "unplayed",
			Body:      []Pos{{X: 48, Y: 46}, {X: 48, Y: 47}, {X: 48, Y: 48}},
			Direction: "up",
		},
		{
			Kind:      "snake",
			Name:      "p4",
			Color:     "white",
			State:     "unplayed",
			Body:      []Pos{{X: 1, Y: 46}, {X: 1, Y: 47}, {X: 1, Y: 48}},
			Direction: "up",
		},
	}
}

func main() {
	rand.Seed(time.Now().UnixNano())
	http.Handle("/", websocket.Handler(HandleClient))
	fmt.Println("Start on port 8081")
	err := http.ListenAndServe(":8081", nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}

func HandleClient(ws *websocket.Conn) {

	// Dés qu'un client se connecte, on lui envoie l'état de la map
	ws.Write(getInitMessage())
	WsSlice = append(WsSlice, WebsocketSnakeLink{ws, -10})
	//ws.Write(getUpdateMessage())

	for {
		/*
		** 1- Reception du message
		 */
		var content string
		err := websocket.Message.Receive(ws, &content)
		fmt.Println("Message:", string(content)) // Un peu de debug

		if err != nil {
			fmt.Println(err)
			return
		}

		/*
		** 2- Trouver le type du message
		 */

		var k KindOnly

		err = json.Unmarshal([]byte(content), &k) // JSON Texte -> Obj
		if err != nil {
			fmt.Println(err)
			return
		}

		kind := k.Kind
		fmt.Println("Kind =", kind)

		/*
		** 3- On envoie vers la bonne fonction d'interprétation
		 */

		// On verrouille avant que la fonction fasse une modification
		GeneralMutex.Lock()

		if kind == "move" { //todo add security here.
			if StateGame.StateGame == "playing" {
				parseMove(content, ws)
			}
		} else if kind == "connect" {
			parseConnect(content, ws)
		} else if kind == "start" {
			StateGame.StateGame = "playing"
			sendAllInitMessage()
			sendAllConnectedUpdateMessage()
			go play()
		} else {
			fmt.Println("Kind inconnue !")
		}

		//sendWholeWorld
		// On déverouille quand c'est fini
		GeneralMutex.Unlock()
	}
}

//game func
func coordIsGood(coordinate Pos) bool {
	for _, snake := range ArraySnake {
		if coordInSlice(coordinate, snake.Body) && snake.State == "alive" {
			return false
		}
	}

	if coordinate.X >= 50 || coordinate.X < 0 || coordinate.Y >= 50 || coordinate.Y < 0 {
		return !EarthIsFlat
	}
	return true
}

func play() {
	GeneralMutex.Lock()
	for i := 1; i <= 2; i++ {
		createApple([]Pos{})
	}
	GeneralMutex.Unlock()
	snakeAlive := 10
	var winner string

	for snakeAlive > 1 {
		time.Sleep(SleepInterval)
		fmt.Println("snake alive : ", snakeAlive)
		snakeAlive = 0
		for index := range ArraySnake {
			GeneralMutex.Lock()
			ArraySnake[index].Move()
			GeneralMutex.Unlock()
		}
		sendAllConnectedUpdateMessage()

		for _, snake := range ArraySnake {
			if snake.State == "alive" {
				winner = snake.Name
				snakeAlive += 1
			}
		}
	}

	GeneralMutex.Lock()
	StateGame.StateGame = "ended"
	GeneralMutex.Unlock()

	sendAllInitMessage()
	sendAllConnectedWinMessage(winner)
	//rebegin?
	reinitServer()
}

//moveFunc
func parseMove(jsonMessage string, websocket *websocket.Conn) {
	var move Move

	err := json.Unmarshal([]byte(jsonMessage), &move) // JSON Texte -> Obj
	if err != nil {
		fmt.Println(err)
		return
	}

	key := move.Key
	fmt.Println("Key=", key)

	for _, wsSnakeLink := range WsSlice {
		if websocket == wsSnakeLink.Websocket && wsSnakeLink.Index != -1 {
			ArraySnake[wsSnakeLink.Index].Direction = key
			break
		}
	}
}

//connectfunc
func parseConnect(content string, currentWebsocket *websocket.Conn) {
	var snake Snake

	err := json.Unmarshal([]byte(content), &snake) // JSON Texte -> Obj
	if err != nil {
		fmt.Println(err)
		//disconnectClient(currentWebsocket)
		//todo deconnect client (function disconnectClient(ws))
		return
	}
	snake.WS = currentWebsocket

	fmt.Println(snake)

	for index, slot := range StateGame.PlayersSlot {
		if slot == snake.Slot {
			StateGame.PlayersSlot = append(StateGame.PlayersSlot[:index], StateGame.PlayersSlot[index+1:]...)
			overwriteSnake(snake)
			break
		}
	}

	for index, ws := range WsSlice {
		if ws.Websocket == currentWebsocket {
			WsSlice[index].Index = snake.Slot - 1
		}
	}

	sendAllInitMessage()
}

//OTHER FUNCTIONS

func overwriteSnake(overwritingSnake Snake) {
	index := overwritingSnake.Slot - 1
	ArraySnake[index].Name = overwritingSnake.Name
	ArraySnake[index].Color = overwritingSnake.Color
	ArraySnake[index].WS = overwritingSnake.WS
	ArraySnake[index].State = "alive"
}

func coordInSlice(a Pos, list []Pos) bool {
	for _, b := range list {
		if b == a {
			return true
		}
	}
	return false
}

func getRandomCoordInCanvas() (ret Pos) {
	x := rand.Intn(StateGame.MapSize)
	y := rand.Intn(StateGame.MapSize)

	ret = Pos{x, y}
	return ret
}

func createApple(forbiddenCoordinate []Pos) { //should probably be method of grid???
	for {
		possibleCoord := getRandomCoordInCanvas()
		forbiddenCoordinate = append(forbiddenCoordinate, ArrayApples...)
		if !coordInSlice(possibleCoord, forbiddenCoordinate) {
			ArrayApples = append(ArrayApples, possibleCoord)
			break
		}
	}
}

//sending func

func sendAllConnectedWinMessage(winner string) {
	for _, ws := range WsSlice {
		if ws.Index != -10 {
			fmt.Println(string(getWinMessage(winner)))
			websocket.Message.Send(ws.Websocket, string(getWinMessage(winner)))
		}
	}
}

func sendAllConnectedUpdateMessage() {
	for _, ws := range WsSlice {
		if ws.Index != -10 {
			websocket.Message.Send(ws.Websocket, string(getUpdateMessage()))
		}
	}
}

func sendAllInitMessage() {
	for _, ws := range WsSlice {
		websocket.Message.Send(ws.Websocket, string(getInitMessage()))
	}
}

func getWinMessage(winner string) []byte {
	var m Win
	m.Kind = "won"
	m.Player = winner

	message, err := json.Marshal(m) // Transformation de l'objet "Win" en JSON
	if err != nil {
		fmt.Println("Something wrong with JSON Marshal map")
	}
	return message
}

// "update" dans le protocole
func getUpdateMessage() []byte {
	var m Update

	m.Kind = "update"
	m.Snakes = ArraySnake
	m.Apples = ArrayApples
	m.MapSize = StateGame.MapSize

	message, err := json.Marshal(m) // Transformation de l'objet "Update" en JSON
	if err != nil {
		fmt.Println("Something wrong with JSON Marshal map")
	}
	return message
}

// "init" dans le protocole
func getInitMessage() []byte {
	// Transformation de l'objet "Init" en JSON
	fmt.Println(StateGame)
	message, err := json.Marshal(StateGame)
	if err != nil {
		fmt.Println("Something wrong with JSON Marshal init")
	}
	return message
}
