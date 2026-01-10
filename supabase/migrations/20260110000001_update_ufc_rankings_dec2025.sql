-- Update UFC Rankings to December 2025
-- Source: ESPN MMA Rankings (Dec 16, 2025)
-- https://www.espn.com/mma/story/_/id/21807736/mma-divisional-rankings-ufc-bellator-pfl-rankings-weight-class

-- Step 1: Clear all existing rankings
UPDATE ufc_fighters SET ranking = NULL WHERE ranking IS NOT NULL;

-- Step 2: Helper function to update fighter ranking by name
-- Uses ILIKE for case-insensitive matching

-- ============================================================================
-- HEAVYWEIGHT (Champion: Tom Aspinall)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Tom Aspinall%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Ciryl Gane%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Curtis Blaydes%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Alexander Volkov%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Sergei Pavlovich%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Jailton Almeida%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Serghei Spivac%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Derrick Lewis%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Marcin Tybura%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Shamil Gaziev%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Tai Tuivasa%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Alexandr Romanov%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Jhonata Diniz%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Jairzinho Rozenstruik%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Martin Buday%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Rodrigo Nascimento%';

-- ============================================================================
-- LIGHT HEAVYWEIGHT (Champion: Alex Pereira)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Alex Pereira%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Magomed Ankalaev%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Jiri Prochazka%' OR full_name ILIKE '%Jiří Procházka%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Carlos Ulberg%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Khalil Rountree%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Azamat Murzakanov%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Dominick Reyes%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Aleksandar Rakic%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Jamahal Hill%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Jan Blachowicz%' OR full_name ILIKE '%Jan Błachowicz%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Nikita Krylov%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Anthony Smith%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Johnny Walker%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Volkan Oezdemir%' OR full_name ILIKE '%Volkan Özdemir%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Dustin Jacoby%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Ryan Spann%';

-- ============================================================================
-- MIDDLEWEIGHT (Champion: Khamzat Chimaev)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Khamzat Chimaev%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Dricus du Plessis%' OR full_name ILIKE '%Dricus Du Plessis%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Nassourdine Imavov%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Sean Strickland%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Israel Adesanya%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Caio Borralho%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Brendan Allen%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Robert Whittaker%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Jared Cannonier%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Paulo Costa%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Marvin Vettori%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Roman Dolidze%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Michel Pereira%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Chris Curtis%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Gregory Rodrigues%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Anthony Hernandez%';

-- ============================================================================
-- WELTERWEIGHT (Champion: Islam Makhachev - moved up from LW)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Islam Makhachev%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Jack Della Maddalena%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Ian Machado Garry%' OR full_name ILIKE '%Ian Garry%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Belal Muhammad%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Kamaru Usman%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Sean Brady%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Shavkat Rakhmonov%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Joaquin Buckley%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Leon Edwards%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Colby Covington%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Gilbert Burns%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Michael Page%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Stephen Thompson%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Geoff Neal%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Vicente Luque%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Neil Magny%';

-- ============================================================================
-- LIGHTWEIGHT (Champion: Ilia Topuria - moved up from FW)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Ilia Topuria%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Arman Tsarukyan%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Charles Oliveira%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Max Holloway%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Justin Gaethje%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Paddy Pimblett%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Mateusz Gamrot%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Rafael Fiziev%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Benoit Saint Denis%' OR full_name ILIKE '%Benoît Saint Denis%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Dustin Poirier%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Michael Chandler%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Beneil Dariush%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Dan Hooker%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Renato Moicano%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Jalin Turner%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Grant Dawson%';

-- ============================================================================
-- FEATHERWEIGHT (Champion: Alexander Volkanovski)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Alexander Volkanovski%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Diego Lopes%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Yair Rodriguez%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Lerone Murphy%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Aljamain Sterling%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Brian Ortega%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Josh Emmett%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Arnold Allen%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Movsar Evloev%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Bryce Mitchell%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Calvin Kattar%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Giga Chikadze%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Edson Barboza%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Dan Ige%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Sodiq Yusuff%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Cub Swanson%';

-- ============================================================================
-- BANTAMWEIGHT (Champion: Petr Yan)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Petr Yan%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Merab Dvalishvili%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Bantamweight'
WHERE full_name ILIKE 'Sean O''Malley' OR full_name ILIKE '%Sean O''Malley%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Umar Nurmagomedov%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Cory Sandhagen%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Mario Bautista%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Song Yadong%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Deiveson Figueiredo%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Marlon Vera%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Henry Cejudo%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Dominick Cruz%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Rob Font%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Jonathan Martinez%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Marcus McGhee%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Adrian Yanez%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Kyler Phillips%';

-- ============================================================================
-- FLYWEIGHT (Champion: Joshua Van)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Joshua Van%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Alexandre Pantoja%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Tatsuro Taira%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Manel Kape%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Brandon Royval%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Brandon Moreno%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Kai Kara-France%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Muhammad Mokaev%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Steve Erceg%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Kai Asakura%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Amir Albazi%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Tim Elliott%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Matheus Nicolau%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Alex Perez%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Tagir Ulanbekov%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Jeff Molina%';

-- ============================================================================
-- WOMEN'S STRAWWEIGHT (Champion: Zhang Weili)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Zhang Weili%' OR full_name ILIKE '%Weili Zhang%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Tatiana Suarez%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Yan Xiaonan%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Amanda Lemos%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Virna Jandiroba%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Jessica Andrade%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Mackenzie Dern%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Marina Rodriguez%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Angela Hill%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Tabatha Ricci%';

UPDATE ufc_fighters SET ranking = 10, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Carla Esparza%';

UPDATE ufc_fighters SET ranking = 11, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Amanda Ribas%';

UPDATE ufc_fighters SET ranking = 12, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Loopy Godinez%' OR full_name ILIKE '%Lupita Godinez%';

UPDATE ufc_fighters SET ranking = 13, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Denise Gomes%';

UPDATE ufc_fighters SET ranking = 14, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Istela Nunes%';

UPDATE ufc_fighters SET ranking = 15, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Luana Santos%';

-- ============================================================================
-- Verification query - log the updated rankings
-- ============================================================================
DO $$
DECLARE
  division_count RECORD;
BEGIN
  RAISE NOTICE 'Rankings updated to December 2025. Summary:';
  FOR division_count IN
    SELECT weight_class, COUNT(*) as ranked_count
    FROM ufc_fighters
    WHERE ranking IS NOT NULL
    GROUP BY weight_class
    ORDER BY weight_class
  LOOP
    RAISE NOTICE '%: % ranked fighters', division_count.weight_class, division_count.ranked_count;
  END LOOP;
END $$;
