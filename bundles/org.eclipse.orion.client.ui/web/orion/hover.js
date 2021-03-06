/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define ([
	'marked/marked' //$NON-NLS-0$
], function(Markdown) {

	function Hover(editor, hoverFactory) {
		this.editor = editor;
		this.hoverFactory = hoverFactory;
		this.inputManager = hoverFactory.inputManager;
		this.serviceRegistry = hoverFactory.serviceRegistry;
		this.commandRegistry = hoverFactory.commandRegistry;
		
		this._qfToolbars = [];
	}
	
	Hover.prototype = {
		computeHoverInfo: function (context) {
			var hoverInfo = [];
			this.hoverFactory._applicableProviders.forEach(function(provider) {
				var providerImpl = this.serviceRegistry.getService(provider);
				if (providerImpl && providerImpl.computeHoverInfo) {
					var editorContext = this.editor.getEditorContext();
					hoverInfo.push(providerImpl.computeHoverInfo(editorContext, context));
				}
			}.bind(this));

			return hoverInfo;
		},
		
		renderMarkDown: function(markDown) {
			return Markdown(markDown, {
				sanitize: true
			});
		},
		
		clearQuickFixes: function() {
			this._qfToolbars.forEach(function(qfTB) {
				qfTB.destroy();
			});
			this._qfToolbars = [];
		},
				
		renderQuickFixes: function(annotation, annotationIterator, parentDiv) {
			if  (!annotation || !parentDiv){
				return;
			}
			
			var actionsDiv = document.createElement("div"); //$NON-NLS-0$
			actionsDiv.className = "commandList"; //$NON-NLS-0$ 
			parentDiv.appendChild(actionsDiv);
			
			// TODO If there are multiple quickfixes, the quickfix all commands will always be at the bottom
			var nodeList = [];
			var metadata = this.inputManager.getFileMetadata();
			metadata.annotation = annotation;
			this.commandRegistry.renderCommands("orion.edit.quickfix", actionsDiv, metadata, this.editor, 'quickfix', annotation, nodeList); //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-2$
			var annotations = [];
			if (annotationIterator){
				while (annotationIterator.hasNext()){
					var current = annotationIterator.next();
					if (current.id === annotation.id){
						annotations.push(current);
					}
				}
				// TODO The annotation model iterator is not guaranteed to be in order (though it is currently), sort them to make sure
				annotations = annotations.sort(function(a, b){
					return a.start - b.start;
				});
				
				
				if (annotations.length > 1){
					actionsDiv = document.createElement("div"); //$NON-NLS-0$
					actionsDiv.className = "commandList"; //$NON-NLS-0$ 
					this.commandRegistry.renderCommands("orion.edit.quickfixAll", actionsDiv, metadata, this.editor, 'quickfixAll', {annotation: annotation, annotations: annotations}, nodeList); //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-2$
					parentDiv.appendChild(actionsDiv);
				}
			}
			delete metadata.annotation;
		}

	};

	function HoverFactory(serviceRegistry, inputManager, commandRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.inputManager = inputManager;
		this.commandRegistry = commandRegistry;
		
		// Filter the plugins based on contentType...
		this.filterHoverPlugins();

		// Track changes to the input type and re-filter
		this.inputManager.addEventListener("InputChanged", function() { //$NON-NLS-0$
			this.filterHoverPlugins();
		}.bind(this));
	}
	HoverFactory.prototype = {
		createHover: function(editor) {
			return new Hover(editor, this);
		},
	
		filterHoverPlugins: function () {
			this._applicableProviders = [];
			var infoProviders = this.serviceRegistry.getServiceReferences("orion.edit.hover"); //$NON-NLS-0$
			for (var i = 0; i < infoProviders.length; i++) {
				var providerRef = infoProviders[i];
				var contentType = this.inputManager.getContentType();
				if (contentType) {
					var validTypes = providerRef.getProperty('contentType'); //$NON-NLS-0$
					if (validTypes && validTypes.indexOf(contentType.id) !== -1) {
						this._applicableProviders.push(providerRef);
					}
				}
			}
		}
	};

	return {HoverFactory: HoverFactory}; 
});


