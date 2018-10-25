'use strict';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, 
    StatusBarItem} from 'vscode';

export function activate(context: ExtensionContext) {
    let apmTracker = new ApmTracker();
    let controller = new ApmTrackerController(apmTracker);

    let disposable = commands.registerCommand('extension.trackApm', () => {
        window.showInformationMessage('Tracking APM!');
    });

    context.subscriptions.push(controller);
    context.subscriptions.push(apmTracker);
    context.subscriptions.push(disposable);
}

export function deactivate() {
}


class ApmTracker{
    private _statusBarItem: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);

    public updateApm(calculatedApm: number, averageApm: number){
        let editor = window.activeTextEditor;
        if(!editor){
            this._statusBarItem.hide();
            return;
        }
        
        let displayedApm = calculatedApm;

        this._statusBarItem.text = `Current APM: ${displayedApm} Average APM: ${averageApm}`;
        this._statusBarItem.show(); 
    }

    dispose(){
        this._statusBarItem.dispose();
    }
}

class ApmTrackerController{
    private _apmTracker: ApmTracker;
    private _disposable: Disposable;
    private  _apmCountPerSecond: number;
    private  _calculatedApm: number;
    private  _averageApm: number;
    private  _elapsedTime: number;
    private  _timeoutTime: number;
    private  _totalApm: number;
    private  _userIsActive: boolean;
    private  _timeOutThreshold: number;
    private  _sampleWindow: number[];

    constructor(apmTracker: ApmTracker){
        this._sampleWindow = [];
        this._apmTracker = apmTracker;
        this._apmCountPerSecond = 0;
        this._calculatedApm = 0;
        this._averageApm = 0;
        this._elapsedTime = 0;
        this._timeoutTime = 0;
        this._totalApm = 0;
        this._timeOutThreshold = 5;

        this._userIsActive = true;

        let subscriptions: Disposable[] = [];

        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);
        window.onDidChangeVisibleTextEditors(this._onEvent, this, subscriptions);
        window.onDidChangeTextEditorVisibleRanges(this._onEvent, this, subscriptions);
        window.onDidChangeTextEditorViewColumn(this._onEvent, this, subscriptions);
        window.onDidOpenTerminal(this._onEvent, this, subscriptions);
        window.onDidCloseTerminal(this._onEvent, this, subscriptions);
        window.onDidChangeWindowState(this._onEvent, this, subscriptions);


        setInterval(() => {
            if(this._userIsActive === true){
                this._elapsedTime++;
            }
            // The array has to grow to a size of 60(representing seconds per minute) 
            // before we start shifting the samples in and out.
            if(this._sampleWindow.length > 60){
                this._sampleWindow.splice(0,1);
                this._sampleWindow.push(this._apmCountPerSecond);
                for(let i = 0; i < this._sampleWindow.length; i++){
                    this._calculatedApm += this._sampleWindow[i];
                }
            }
            else{
                this._sampleWindow.push(this._apmCountPerSecond);
                for(let i = 0; i < this._sampleWindow.length; i++){
                    this._calculatedApm += this._sampleWindow[i];
                    // console.log(this._sampleWindow[i]);
                }
            }

            this._totalApm += this._calculatedApm;
            this._averageApm = this._totalApm / (this._elapsedTime);
            this._averageApm = Math.floor(this._averageApm);

            this._apmTracker.updateApm(this._calculatedApm, this._averageApm);
            this._apmCountPerSecond = 0;
            this._calculatedApm = 0;

        }, 1000);

        setInterval(() =>{
            this._timeoutTime += 1;
            this._checkTimeout();
        }, 1000);

        this._disposable = Disposable.from(...subscriptions);
    }

    public _checkTimeout(){
        if (this._timeoutTime > this._timeOutThreshold){
            this._userIsActive = false;
        }
    }

    private _onEvent(){
        this._apmCountPerSecond += 1;
        this._timeoutTime = 0;
        this._userIsActive = true;
    }

    dispose(){
        this._disposable.dispose();
    }
}