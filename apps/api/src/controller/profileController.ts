import { languageController } from "../ControllerHandler/languageControler";
import { withValidation } from "../utils";
import { languageField } from "../validation/languageValidation";

export const changeLanguage = withValidation(languageField, languageController);