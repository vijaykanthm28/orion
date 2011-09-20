/*******************************************************************************
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window dojo*/

define(['dojo'], function(dojo) {

var eclipse = eclipse || {};
/*
 * Listens to editor change, looks up validator service for the file type, calls validator service, passes result to the marker service.
 */
eclipse.SyntaxChecker = (function () {
	function SyntaxChecker(serviceRegistry, editor) {
		this.registry = serviceRegistry;
		this.editor = editor;
		dojo.connect(this.editor, "onInputChange", this, this.checkSyntax);
	}
	SyntaxChecker.prototype = {
		checkSyntax: function (title, message, contents, contentsSaved) {
			if (!message) {
				var t = title;
				var c = contents;
				var validators = this.registry.getServiceReferences("orion.edit.validator");
				var filteredValidators = [];
				for (var i=0; i < validators.length; i++) {
					var serviceReference = validators[i];
					var pattern = serviceReference.getProperty("pattern");
					if (pattern && new RegExp(pattern).test(title)) {
						filteredValidators.push(serviceReference);
					}
				}
				
				var callService = function(validationService) {
					return validationService.checkSyntax(title, contents);
				};
				var extractProblems = function(data) {
					return data.errors;
				};
				var problemPromises = [];
				for (i=0; i < filteredValidators.length; i++) {
					var validator = filteredValidators[i];
					problemPromises.push(
						this.registry.getService(validator)
							.then(callService)
							.then(extractProblems));
				}
				
				new dojo.DeferredList(problemPromises)
					.then(dojo.hitch(this, function(result) {
						var problems = [];
						for (i=0; i < result.length; i++) {
							var probs = result[i] && result[i][1];
							if (probs) {
								problems = problems.concat(probs);
							}
						}
						this.registry.getService("orion.core.marker").then(function(markerService) {
							markerService._setProblems(problems);
						});}));
			}
		}
	};
	return SyntaxChecker;
}());
return eclipse;	
});
