import React, {Component} from "react";
import Cookies from "js-cookie";
import Navigator from "./Navigator";
import Reader from "./Reader";
import StatusBar from "./StatusBar";
import { injectIntl } from "react-intl";

const URL_PREFIX = '/b';
const DEFAULT_TRANSLATION = 'pl_pubg';
const DEFAULT_BOOK = 'joh';
const DEFAULT_CHAPTER = '1';
const COOKIE_EXPIRES = 365;

class Bible extends Component {
    constructor(props) {
        super(props);

        this.state = {
            error: null,

            isBooksLoaded: false,
            isTranslationsLoaded: false,
            isStructureLoaded: false,
            showVerses: false,

            books: [],
            translations: [],
            structure: [],
            chapters: [],
            verses: [],

            selectedTranslation: this.getAddressFromHistory().translation, // default translation
            selectedBook: '',
            selectedChapter: '',
            isInitialLoading: true
        };

        this.getDefaultBook = this.getDefaultBook.bind(this);
        this.getDefaultChapter = this.getDefaultChapter.bind(this);

    }

    getAddressFromHistory() {
        const [
            ,, //ignore first two elements "", "b"
            defaultTranslation = DEFAULT_TRANSLATION,
            defaultBook = DEFAULT_BOOK,
            defaultChapter = DEFAULT_CHAPTER,
        ] = window.location.pathname
            .replace(/\/$/, "") // remove trailing slash from the end of path
            .split("/");

        const translation = Cookies.get('recent_translation') ? Cookies.get('recent_translation') : defaultTranslation,
            book = Cookies.get('recent_book') ? Cookies.get('recent_book') : defaultBook,
            chapter = Cookies.get('recent_chapter') ? Cookies.get('recent_chapter') : defaultChapter;

        return {translation, book, chapter};
    }

    /*
     * The history (url path) should be updated when
     * the last call is finished and verses are ready to be displayed
     */
    updateHistory(translation, book, chapter) {
        Cookies.set('recent_translation', translation, { expires: COOKIE_EXPIRES });
        Cookies.set('recent_book', book, { expires: COOKIE_EXPIRES });
        Cookies.set('recent_chapter', chapter, { expires: COOKIE_EXPIRES });

        window.history.pushState({},"",
            URL_PREFIX+"/"+
            translation+"/"+
            book+"/"+
            chapter
        );
    }

    changeSelectedTranslation(selectedTranslation) {

        this.setState({
            showVerses: false,
            isStructureLoaded: false,
            selectedTranslation: selectedTranslation,
        });

        fetch("/api/translation/" + selectedTranslation)
            .then(res => res.json())
            .then(
                (result) => {
                    this.setState({
                        isStructureLoaded: true,
                        structure: result.data,
                    }, () => {
                        const defaultBook = this.getDefaultBook();
                        this.changeSelectedBook(defaultBook);
                    });
                },
                (error) => {
                    this.setState({
                        error
                    });
                }
            );
    }

    /*
     * when initial (first) call, return default book from url
     * otherwise, return DEFAULT_BOOK if exist
     * otherwise, return first existing book
     */
    getDefaultBook() {
        const { structure, isInitialLoading } = this.state;
        if(isInitialLoading) {
            return this.getAddressFromHistory().book;
        }

        if(structure[DEFAULT_BOOK]) {
            return DEFAULT_BOOK;
        }

        // otherwise, get first book
        return Object.keys(structure)[0];
    }

    /*
     * when initial (first) call, return DEFAULT_CHAPTER from url
     * otherwise, return first existing chapter
     */
    getDefaultChapter() {
        const {structure, selectedBook, isInitialLoading} = this.state;
        if(isInitialLoading) {
            return this.getAddressFromHistory().chapter;
        }
        return structure[selectedBook][0];
    }

    changeSelectedBook(selectedBook) {
        this.setState({
            selectedBook: selectedBook,
            chapters: this.state.structure[selectedBook],
        }, () => {
            const defaultChapter = this.getDefaultChapter();
            this.changeSelectedChapter(defaultChapter);
        });
    }

    changeSelectedChapter(selectedChapter) {

        const {selectedTranslation, selectedBook} = this.state;

        this.updateHistory(selectedTranslation, selectedBook, selectedChapter);

        this.setState({
            showVerses: false,
            isInitialLoading: false
        });
        
        fetch("/api/translation/" + selectedTranslation + "/book/" + selectedBook + "/chapter/" + selectedChapter)
            .then(res => res.json())
            .then(
                (result) => {
                    this.setState({
                        showVerses: true,
                        selectedChapter,
                        verses: result.data,
                    });
                },
                (error) => {
                    this.setState({
                        error
                    });
                }
            );
    }

    componentDidMount() {
        Promise.all([
            fetch("/api/translation")
                .then(res => res.json())
                .then(
                    (result) => {
                        this.setState({
                            isTranslationsLoaded: true,
                            translations: result.data
                        });
                    },
                    (error) => {
                        this.setState({
                            isTranslationsLoaded: true,
                            error
                        });
                    }
                ),
            fetch("/api/book")
                .then(res => res.json())
                .then(
                    (result) => {
                        this.setState({
                            isBooksLoaded: true,
                            books: result.data
                        });
                    },
                    (error) => {
                        this.setState({
                            isBooksLoaded: true,
                            error
                        });
                    }
                )
            ]).then(() => {
                this.changeSelectedTranslation(this.state.selectedTranslation);
            });
    }

    render() {
        const {error, isTranslationsLoaded, isBooksLoaded, isStructureLoaded, showVerses,
            translations, books, verses, structure, chapters,
            selectedBook, selectedChapter, selectedTranslation} = this.state;

        const { setLocale, intl: {formatMessage} } = this.props;

        if (error) {
            return (
                <div className="container app-preloader">
                    <div className="row">
                        <div className="col-12 d-flex align-items-center justify-content-center">
                            {formatMessage({id:'unexpectedErrorOccurred'})} {error.message}
                        </div>
                    </div>
                </div>
            );
        } else if (!isTranslationsLoaded || !isBooksLoaded) {
            return (
                <div className="container app-preloader">
                    <div className="row">
                        <div className="col-12 d-flex align-items-center justify-content-center">
                            {formatMessage({id:'preparingApplicationPleaseWait'})}
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="container app">
                    <Navigator
                        books={books}
                        translations={translations}
                        selectedTranslation={selectedTranslation}
                        selectedChapter={selectedChapter}
                        selectedBook={selectedBook}
                        structure={structure}
                        chapters={chapters}
                        isStructureLoaded={isStructureLoaded}
                        changeSelectedTranslation={this.changeSelectedTranslation.bind(this)}
                        changeSelectedBook={this.changeSelectedBook.bind(this)}
                        changeSelectedChapter={this.changeSelectedChapter.bind(this)}
                    />
                    <Reader
                        showVerses={showVerses}
                        selectedBook={selectedBook}
                        selectedChapter={selectedChapter}
                        verses={verses}
                    />
                    <StatusBar
                        setLocale={setLocale}
                        translations={translations}
                    />
                </div>
            );
        }
    }
}

export default injectIntl(Bible);