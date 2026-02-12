import { AppConfiguration } from 'src/app/app-configuration';
import { XmlJsElement } from './xml-js-element';
import { AltoVersionContent } from './alto-version';
import { CurrentUser, UserInfo } from './user-info';

export class AppState {
  // Users (set by loadCurrentUser when logged in, cleared on logout)
  currentUser: CurrentUser | null = null;
  krameriusUsers: UserInfo[] = [];
  engineUsers: UserInfo[] = [];

  currentAltoVersion: AltoVersionContent;

  config: AppConfiguration;
  altoXml: string;
  alto: any;
  printSpace: XmlJsElement;
  alto0Xml: string;
  alto0: any;
  printSpace0: XmlJsElement;
  currentObject: any;

  selectedAlto: {
    blocks: XmlJsElement[];
    lines: XmlJsElement[];
    words: XmlJsElement[];
  };
  selectedBlocks: XmlJsElement[] = [];
  selectedLines: XmlJsElement[] = [];
  selectedWords: XmlJsElement[] = [];

  setPrintSpace(alto: any) {
    return alto.elements[0].elements
      .find((e: XmlJsElement) => e.name === 'Layout')
      .elements.find((e: XmlJsElement) => e.name === 'Page')
      .elements.find((e: XmlJsElement) => e.name === 'PrintSpace');
  }

  clearSelection() {
    this.selectedBlocks = [];
    this.selectedLines = [];
    this.selectedWords = [];
    this.selectedAlto = {
      blocks: this.selectedBlocks,
      lines: this.selectedLines,
      words: this.selectedWords,
    };
  }

  getAltoDescription(alto: any) {
    return alto.elements[0].elements
      .find((e: XmlJsElement) => e.name === 'Description')
      .elements.find((e: XmlJsElement) => e.name === 'OCRProcessing')
      .elements.find((e: XmlJsElement) => e.name === 'ocrProcessingStep');
  }
}
