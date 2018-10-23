'use strict';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, 
    StatusBarItem} from 'vscode';

export function activate(context: ExtensionContext) {

    console.log('Congratulations, your extension "coding-apm-tracker" is now active!');

    let apmTracker = new ApmTracker();
    let controller = new ApmCounterController(apmTracker);

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

    public updateAPM(calculatedApm: number){
        let editor = window.activeTextEditor;
        if(!editor){
            this._statusBarItem.hide();
            return;
        }
        console.log("Updating APM!");
        
        let displayedApm = calculatedApm;

        this._statusBarItem.text = `${displayedApm} APM`;
        this._statusBarItem.show(); 
    }

    dispose(){
        this._statusBarItem.dispose();
    }
}

class ApmCounterController{
    private _apmTracker: ApmTracker;
    private _disposable: Disposable;
    public _apmCount: number;
    public _calculatedApm: number;

    constructor(apmTracker: ApmTracker){
        this._apmTracker = apmTracker;
        this._apmCount = 0;
        this._calculatedApm = 0;

        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        setInterval(() => {
            console.log("APM Calculating");
            if(this._apmCount === 0){
                this._calculatedApm = 0;
            }else{
                this._calculatedApm = this._apmCount * 60;
                this._calculatedApm = Math.floor(this._calculatedApm);
            }
            this._apmCount = 0;
            this._apmTracker.updateAPM(this._calculatedApm);
        }, 1000);

        this._disposable = Disposable.from(...subscriptions);

    }

    private _onEvent(){
        this._apmCount += 1;
    }

    dispose(){
        this._disposable.dispose();
    }
}