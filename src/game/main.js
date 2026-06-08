import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { OrderGame } from './scenes/OrderGame';
import { SumGame } from './scenes/SumGame';
import { ColorGame } from './scenes/ColorGame';
import { MemoryGame } from './scenes/MemoryGame';
import { PuzzleGame } from './scenes/PuzzleGame';
import { StarGame } from './scenes/StarGame';
import { WordGame } from './scenes/WordGame';
import { PatternGame } from './scenes/PatternGame';
import { RhymeGame } from './scenes/RhymeGame';
import { SoundGame } from './scenes/SoundGame';
import { TicTacToe } from './scenes/TicTacToe';
import { FruitCatcher } from './scenes/FruitCatcher';
import { MazeGame } from './scenes/MazeGame';
import { SpinnerGame } from './scenes/SpinnerGame';
import { PacManGame } from './scenes/PacMan';
import { ClockGame } from './scenes/ClockGame';
import { JumpGame } from './scenes/JumpGame';
import { WordBuilder } from './scenes/WordBuilder';
import { Preloader } from './scenes/Preloader';

import { AUTO, Game, Scale } from 'phaser';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        OrderGame,
        SumGame,
        ColorGame,
        MemoryGame,
        PuzzleGame,
        StarGame,
        WordGame,
        PatternGame,
        RhymeGame,
        SoundGame,
        TicTacToe,
        FruitCatcher,
        MazeGame,
        SpinnerGame,
        PacManGame,
        ClockGame,
        JumpGame,
        WordBuilder,
        MainGame,
        GameOver
    ],
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const StartGame = (parent) => {

    return new Game({ ...config, parent });

}

export default StartGame;
