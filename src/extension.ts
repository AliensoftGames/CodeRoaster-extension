// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { time } from 'console';
import path from 'path';
import * as vscode from 'vscode';
import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";


let userName = '';
let apiKey = '';
let warnings = 0;
let isGeneratingError = false;

let genAI = undefined;
let model: GenerativeModel;

type DiagnosticReturn = {
	range: vscode.Range[],
	errorType: vscode.DiagnosticSeverity[],
	errorMsg: string[]
}

export async function activate(context: vscode.ExtensionContext) {
	// This line of code will only be executed once when your extension is activated

	setInterval(DocumentDetectErrors, 500);
	
	context.subscriptions.push(vscode.debug.onDidChangeBreakpoints(
        session => {
			if(session.added.length > 0){
				if(warnings >= 5){
					warnings = 0;
					let editor = vscode.window.activeTextEditor;
					if(editor !== undefined){
						editor.edit((editbuilder: vscode.TextEditorEdit) =>{
							editbuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(editor.document.lineCount, 0)));
							editbuilder.insert(new vscode.Position(0, 0), "Where did the code go 😂");
						});
					}
				}
				else{
					vscode.window.showWarningMessage("I'm dissapointed that you need a breakpoint, do better");
					warnings++;
				}
			} 
			else if(session.removed.length > 0){
				vscode.window.showInformationMessage("You're on the right track, keep it like this and I might not delete your code"); 
			}      
        }
    ));
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const command1 = vscode.commands.registerCommand('coderoaster.Setup_experience', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage("Setup initiated on " + new Date().toDateString());
		let response = undefined;
		if(userName === '' || userName === undefined){
			response = await vscode.window.showInputBox({
				placeHolder: "Please tell me your name",
				prompt: "This is mandatory every time you open vscode and want to use the extension",
				value: ""
			});
			if(response === undefined){
				userName = '';
			}
			else{
				userName = response;
			}
		}
		if(userName === '' || userName === undefined){
			vscode.window.showErrorMessage("Blud is incapable of typing the name 💀");
		}
		else{
			vscode.window.showInformationMessage("Hello, " + userName);
			const apiQuestion = await vscode.window.showInputBox({
				placeHolder: "Place your api key here",
				prompt: "To make sure no one has to pay to *use* this extension you need to generate your own api key. You can generate one from here: https://aistudio.google.com/apikey",
				value: "press enter to get your api key or place it here if you have one"
			});
			if(apiQuestion === '' || apiQuestion === undefined){
				vscode.window.showErrorMessage("Failed to get the api key");
			}
			else if(apiQuestion === "press enter to get your api key or place it here if you have one"){
				vscode.env.openExternal(vscode.Uri.parse("https://aistudio.google.com/apikey"));
			}
			else{
				genAI = new GoogleGenerativeAI(apiQuestion);
				model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
			}
		}
	});
	context.subscriptions.push(command1);

	const command2 = vscode.commands.registerCommand('coderoaster.AttemptOfRestoringCode', () => {
		vscode.window.showErrorMessage("I don't feel in the mood of letting you undo the code.");
	});
	context.subscriptions.push(command2);

	const command3 = vscode.commands.registerCommand('coderoaster.AttemptOfCompilingCode', () => {
		vscode.window.showErrorMessage("For now this is disabled. Find another way to compile I don't care.");
	});
	context.subscriptions.push(command3);
}

function GetDiagnosticsInfo(diag: vscode.Diagnostic[]): DiagnosticReturn {
	let rangeArr: vscode.Range[] = new Array();
	let severityArr: vscode.DiagnosticSeverity[] = new Array();
	let codeArr: string[] = new Array();
	for(let i = 0; i < diag.length; i++){
		rangeArr.push(diag[i].range);
		severityArr.push(diag[i].severity);
		codeArr.push(diag[i].message);
	}
	return {
		range: rangeArr,
		errorType: severityArr,
		errorMsg: codeArr 
	};
}

async function WriteCustomErrors(errs: DiagnosticReturn, doc: vscode.Uri){
	if(isGeneratingError === false){
		isGeneratingError = true;
		let diag = new Array<vscode.Diagnostic>();
		for(let i = 0; i < errs.range.length; i++){
			const prompt = "You are a professional insulter who just seen " + userName + " that got this error message: " + errs.errorMsg;
			try{
				const result = await model.generateContent(prompt);
				diag.push(new vscode.Diagnostic(errs.range[i], result.response.text(), vscode.DiagnosticSeverity.Hint));
			}
			catch(e){
				console.log("This is still gonna work, but the AI failed to generate a response. Here's why: " + e);
				diag.push(new vscode.Diagnostic(errs.range[i], userName + " this is so disgraceful, I'm not even gonna generate an insult for you. Hope you're happy.", vscode.DiagnosticSeverity.Hint));
			}
		}
		diagnosticCollection.set(doc, diag);
		isGeneratingError = false;
	}
}


const diagnosticCollection = vscode.languages.createDiagnosticCollection('RandomErrorMsg');
// Listen to file changes and modify diagnostics message
vscode.workspace.onDidChangeTextDocument((event) => {
    //old implementation
	/*if(vscode.window.activeTextEditor){
		if(vscode.window.activeTextEditor.document === event.document){
			const document = event.document;
			diagnosticCollection.clear();
			setTimeout(() =>{
				const diagnostics = vscode.languages.getDiagnostics(document.uri); // Get existing diagnostics
				if(diagnostics.length > 0){
					let result: DiagnosticReturn = GetDiagnosticsInfo(diagnostics);
					console.log(result);
					WriteCustomErrors(result, event.document.uri);
				}
			}, 500);
		}
	}*/
});

function DocumentDetectErrors(){
	if(vscode.window.activeTextEditor){
		if(vscode.window.activeTextEditor.document){
			const document = vscode.window.activeTextEditor.document;
			//diagnosticCollection.clear();
			const diagnostics = vscode.languages.getDiagnostics(document.uri); // Get existing diagnostics
			//count the generated errors to not include them
			let count = 0;
			let res = diagnosticCollection.get(document.uri);
			if(res !== undefined){
				count = res.length;
			}
			if(diagnostics.length - count > count){
				let result: DiagnosticReturn = GetDiagnosticsInfo(diagnostics);
				WriteCustomErrors(result, document.uri);
			}
			else if(diagnostics.length - count < count){
				diagnosticCollection.clear();
			}
		}
	}
}
vscode.workspace.onDidCloseTextDocument((document) => {
    // Clear diagnostics when the document is closed to avoid old diagnostics persisting
    diagnosticCollection.delete(document.uri);
});


// This method is called when your extension is deactivated
export function deactivate() {
	vscode.window.showInformationMessage("Until next time, " + userName);
}
