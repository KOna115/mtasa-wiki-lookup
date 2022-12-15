'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//const { default: fetch } = require('node-fetch');
const vscode = require('vscode');
//const { default: request } = require('request');
const { default: fs } = require('fs');
//const axios = require('axios');
const request = require('request');
const cheerio = require('cheerio');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

var panel = null;

function activate(context) {

	vscode.window.showInformationMessage('Initiating MTA:SA Wiki Lookup extension...');

	//Init webview
	panel = vscode.window.createWebviewPanel(
		'mtaWiki',
		'MTA Wiki Lookup',
		vscode.ViewColumn.Beside,
		{}
	);

	//Show loaded messagge
	vscode.window.showInformationMessage("[MTA:SA Wiki Lookup] Loaded! Ready for use!");

	//External browser lookup cmd
	context.subscriptions.push(vscode.commands.registerCommand('mta-wiki-lookup.browser', 
	function () {
		
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const selectedText = editor.document.getText(editor.selection);
		
		if (!selectedText || selectedText.length < 1) {
			
			return;
		}
		
		const page = capitalizeFirstLetter(selectedText);
		vscode.env.openExternal(vscode.Uri.parse('https://wiki.multitheftauto.com/wiki/' + page));

	}));


	//Internal lookup cmd 
	context.subscriptions.push(vscode.commands.registerCommand('mta-wiki-lookup.vscode-browser', 
	function () {
		
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const selectedText = editor.document.getText(editor.selection);
		
		if (!selectedText || selectedText.length < 1) {
			
			return;
		}
		
		const page = capitalizeFirstLetter(selectedText);
		getWebviewContent(page);

	}));
}

// This method is called when your extension is deactivated
function deactivate() {}

function getWebviewContent(page) {

	request('https://wiki.multitheftauto.com/wiki/' + page, function (error, response, body) {
		console.error('error:', error); // Print the error if one occurred
		console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
		if (response.statusCode != 200) {
			vscode.window.showErrorMessage("Wiki page not found!");
			return;
		}
		
		//Analyze HTML data
		let parsed = parsePage(body, page);
		
		//Update webview content
		panel.webview.html = parsed;
	});
}

function parsePage(input, page) {
	
	//Get Title
	const title = deCapitalizeFirstLetter(page);

	//Get part of interest
	var $ = cheerio.load(input);
	$ = cheerio.load($('.mw-parser-output').html());

	//Prepend title
	var toAnalyze = $('*').html();
	toAnalyze = '<h1 style="text-align: center;">' + title + '</h1>' + toAnalyze;

	//Remove unnecessary parts
	var endIndex = toAnalyze.indexOf('<h2><span class="mw-headline" id="Example">Example</span></h2>');
	toAnalyze = toAnalyze.substring(0, endIndex);

	//Replace opening tag of syntax
	toAnalyze = toAnalyze.replaceAll('<pre class="prettyprint lang-lua">', '<p style="text-align: center; margin-top:50px; margin-bottom:50px;">'); 

	//Highlight variable types
	const variableTypes = [ 'bool', 'int', 'element', 'string', 'float', 'player', 'vehicle' ];
	variableTypes.forEach(type => {
		toAnalyze = toAnalyze.replaceAll(' ' + type + " ", '<span style="color:#16a34a; font-weight:500;"> ' + type + ' </span>');
		toAnalyze = toAnalyze.replaceAll(type + " ", '<span style="color:#16a34a; font-weight:500;">' + type + ' </span>');
	});

	//Highlight looked up
	toAnalyze = toAnalyze.replaceAll(title, '<span style="color:#d97706; font-weight:500;">' + title + '</span>');

	//Highlight ()
	let parentheses = [ '(', ')' ];
	parentheses.forEach(type => {
		toAnalyze = toAnalyze.replaceAll(type, '<span style="color:#dc2626; font-weight:500;">' + type + '</span>');
	});

	//Highlight []
	parentheses = [ '[', ']' ];
	parentheses.forEach(type => {
		toAnalyze = toAnalyze.replaceAll(type, '<span style="color:#2563eb; font-weight:500;">' + type + '</span>');
	});

	//Replace closing tag of syntax
	toAnalyze = toAnalyze.replaceAll('</pre>', '</p>');

	return toAnalyze;
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function deCapitalizeFirstLetter(string) {
	return string.charAt(0).toLowerCase() + string.slice(1);
}


module.exports = {
	activate,
	deactivate
}

